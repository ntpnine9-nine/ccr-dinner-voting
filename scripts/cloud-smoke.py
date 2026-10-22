"""Explicit live integration test. Creates disposable submissions and removes their votes.

CCR_ADMIN_CREDENTIALS_FILE must point to a private JSON file with email/password.
Never commit that file. Does not print credentials, JWTs, or participant tokens.
"""
import json
import os
import re
import secrets
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

root = Path(__file__).resolve().parents[1]
config = (root / "config.js").read_text()
base = re.search(r"supabaseUrl: '([^']+)'", config)[1]
key = re.search(r"publishableKey: '([^']+)'", config)[1]
campaign = re.search(r"campaignId: '([^']+)'", config)[1]
credentials = json.loads(Path(os.environ["CCR_ADMIN_CREDENTIALS_FILE"]).read_text())
checks = []
token = ""
cleanup_ids = set()


def request(path, payload, bearer=""):
    headers = {"Content-Type": "application/json", "apikey": key}
    if bearer:
        headers["Authorization"] = "Bearer " + bearer
    req = Request(base + path, json.dumps(payload).encode(), headers, method="POST")
    try:
        with urlopen(req, timeout=25) as response:
            return response.status, json.load(response)
    except HTTPError as error:
        return error.code, json.load(error)


def api(op, **payload):
    return request("/functions/v1/vote", {"op": op, "campaign": campaign, **payload}, token if op.startswith("admin.") else "")


def ok(op, **payload):
    status, data = api(op, **payload)
    assert status == 200 and data.get("ok"), (op, status, data)
    return data


def check(label, condition):
    assert condition, label
    checks.append(label)
    print("PASS", label, flush=True)


status, auth = request("/auth/v1/token?grant_type=password", credentials)
check("owner password login", status == 200 and bool(auth.get("access_token")))
token = auth["access_token"]
# Private runtime receipt allows another verification process to reuse this test session.
if os.environ.get("CCR_TEST_SESSION_FILE"):
    session_file = Path(os.environ["CCR_TEST_SESSION_FILE"])
    session_file.write_text(json.dumps(auth))
    session_file.chmod(0o600)

initial = ok("admin.results")
check("owner role authorized", "tallies" in initial)
admission = ok("status")
check("open public submissions enabled", admission["open"] and admission["votingMode"] == "open")
status, _ = request("/functions/v1/vote", {"campaign": campaign, "op": "admin.results"})
check("unauthenticated admin denied", status == 403)

choices = {k: k + "1" for k in "ABCDEFGH"}
device_a, device_b = secrets.token_hex(32), secrets.token_hex(32)

try:
    bad = ok("admin.invites.list")
    status, _ = api("preferences.submit", deviceToken=secrets.token_hex(32), attendance="invalid", giftChoice="gift_300", themeChoice="midnight_gold")
    check("invalid public submission rejected", status == 400)
    check("invalid submission leaves no orphan identity", len(ok("admin.invites.list")["items"]) == len(bad["items"]))

    a = ok("submit", deviceToken=device_a, choices=choices, catalogVersion=admission["catalogVersion"])
    check("cloud ballot receipt and timestamp", bool(re.fullmatch(r"[a-f0-9-]{36}", a["receipt"])) and bool(a["saved_at"]))
    prefs = ok("preferences.submit", deviceToken=device_a, attendance="yes", giftChoice="gift_300", themeChoice="midnight_gold")
    check("cloud RSVP receipt and timestamp", bool(prefs["receipt"]) and bool(prefs["saved_at"]))
    rows = ok("admin.submissions.list")["items"]
    row_a = next(row for row in rows if (row.get("ballot") or {}).get("id") == a["receipt"])
    cleanup_ids.add(row_a["inviteId"])
    check("independent admin read sees ballot and RSVP together", row_a["preferences"]["attendance"] == "yes")
    check("one submission counted", ok("admin.results")["count"] == initial["count"] + 1)

    edited = {k: k + "2" for k in "ABCDEFGH"}
    again = ok("submit", deviceToken=device_a, choices=edited)
    check("retry updates same ballot without duplicate", again["receipt"] == a["receipt"] and ok("admin.results")["count"] == initial["count"] + 1)
    b = ok("submit", deviceToken=device_b, choices=choices)
    row_b = next(row for row in ok("admin.submissions.list")["items"] if (row.get("ballot") or {}).get("id") == b["receipt"])
    cleanup_ids.add(row_b["inviteId"])
    check("second participant visible centrally", ok("admin.results")["count"] == initial["count"] + 2)

    ok("admin.ballot.save", inviteId=row_a["inviteId"], choices=choices)
    ok("admin.preferences.save", inviteId=row_a["inviteId"], attendance="maybe", giftChoice="gift_none", themeChoice="come_as_you_are")
    read_a = next(r for r in ok("admin.submissions.list")["items"] if r["inviteId"] == row_a["inviteId"])
    check("admin edits persist to cloud", read_a["ballot"]["choices"] == choices and read_a["preferences"]["attendance"] == "maybe")
    status, _ = api("admin.ballot.save", inviteId=row_a["inviteId"], choices={"A": "A1"})
    check("invalid admin edit rejected", status == 400)
    ok("admin.ballot.delete", inviteId=row_a["inviteId"])
    check("admin deletes cloud ballot", ok("admin.results")["count"] == initial["count"] + 1)
    ok("admin.preferences.delete", inviteId=row_a["inviteId"])
    read_a = next(r for r in ok("admin.submissions.list")["items"] if r["inviteId"] == row_a["inviteId"])
    check("admin deletes cloud RSVP", read_a["ballot"] is None and read_a["preferences"] is None)

    invitation = ok("admin.invites", count=1)["items"][0]
    cleanup_ids.add(invitation["id"])
    invited = ok("submit", code=invitation["code"], choices=choices)
    check("existing invite submission path works", bool(invited["receipt"]))
    ok("admin.invites.revoke", inviteId=invitation["id"])
    status, _ = api("submit", code=invitation["code"], choices=choices)
    check("revoked invitation cannot submit", status == 400)

finally:
    for invite_id in cleanup_ids:
        ok("admin.submission.delete", inviteId=invite_id)
        ok("admin.invites.revoke", inviteId=invite_id)
    check("disposable votes removed, original count preserved", ok("admin.results")["count"] == initial["count"])

report = {"checks": checks, "passed": len(checks), "campaign": campaign, "createdTestInviteIds": sorted(cleanup_ids)}
report_path = os.environ.get("CCR_SMOKE_REPORT")
if report_path:
    Path(report_path).write_text(json.dumps(report, indent=2))
print("PASS", len(checks), "live checks; credentials redacted")
