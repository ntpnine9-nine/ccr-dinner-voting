"""Live public label checks. Writes only this run's hashes/receipts to a private file.

The verifier uses that file to inspect and remove exactly these test submissions.
Does not require an admin password or print participant capabilities.
"""
import concurrent.futures
import hashlib
import json
import os
import re
import secrets
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

root = Path(__file__).resolve().parents[1]
config = (root / 'config.js').read_text()
base = re.search(r"supabaseUrl: '([^']+)'", config)[1]
key = re.search(r"publishableKey: '([^']+)'", config)[1]
campaign = re.search(r"campaignId: '([^']+)'", config)[1]
devices = [secrets.token_hex(32) for _ in range(4)]
state_file = Path(os.environ['CCR_LABEL_TEST_STATE'])
checks = []
state = {'hashes': [hashlib.sha256((campaign+':open:'+d).encode()).hexdigest() for d in devices], 'receipts': [], 'checks': checks}


def checkpoint():
    state_file.write_text(json.dumps(state, ensure_ascii=False, indent=2))
    state_file.chmod(0o600)


def request(op, **payload):
    req = Request(base+'/functions/v1/vote', json.dumps({'campaign': campaign, 'op': op, **payload}).encode(), {'Content-Type': 'application/json', 'apikey': key}, method='POST')
    try:
        with urlopen(req, timeout=30) as response:
            return response.status, json.load(response)
    except HTTPError as error:
        return error.code, json.load(error)


def check(label, condition):
    assert condition, label
    checks.append(label)
    checkpoint()
    print('PASS', label, flush=True)


choices = {k: k+'1' for k in 'ABCDEFGH'}
checkpoint()
labels = ['ทดสอบชื่อเดียวกัน ๑๒๓ 🌙', 'ทดสอบชื่อเดียวกัน ๑๒๓ 🌙', '', '=1+1']


def initial(i):
    return request('submit', deviceToken=devices[i], participantLabel=labels[i], choices=choices)


with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    responses = list(pool.map(initial, range(4)))
for i, (status, data) in enumerate(responses):
    check(['Thai/numeric/emoji alias accepted', 'duplicate alias accepted separately', 'anonymous submission accepted', 'special characters stored as text'][i], status == 200 and bool(data.get('receipt')) and bool(data.get('saved_at')))
    state['receipts'].append(data['receipt'])
    checkpoint()
check('duplicate labels have different ballot IDs', state['receipts'][0] != state['receipts'][1])

status, pref = request('preferences.submit', deviceToken=devices[0], participantLabel=labels[0], attendance='yes', giftChoice='gift_none', themeChoice='come_as_you_are')
check('RSVP accepts same free label', status == 200 and bool(pref.get('receipt')))
state['preferenceInviteId'] = pref['receipt']
status, renamed = request('submit', deviceToken=devices[0], participantLabel='ชื่อใหม่ ABC ๑๒๓ 🌙', choices={k:k+'2' for k in 'ABCDEFGH'})
check('rename updates original ballot', status == 200 and renamed.get('receipt') == state['receipts'][0])
status, old_client = request('submit', deviceToken=devices[1], choices=choices)
check('old client without label remains compatible', status == 200 and old_client.get('receipt') == state['receipts'][1])


def rejected(label):
    status, _ = request('submit', deviceToken=devices[2], participantLabel=label, choices=choices)
    return status == 400


with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    invalid = list(pool.map(rejected, ['x'*81, 123, 'a\nb']))
check('oversized, non-text and control-character labels rejected', all(invalid))
checkpoint()
print('PASS', len(checks), 'public API label checks; cleanup required using the private state file', flush=True)
