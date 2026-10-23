# Forest Noir V2 — source implementation and review

Date: 23 October 2026. Baseline: b829bd9a6a2c15b75247f7466bdaf664f84393a2 (main).
Status: implementation complete; owner authorized publication to the actual website on 23 October 2026. Release verification receipts are recorded separately.
The owner's latest instruction authorizes source implementation. The latest owner instruction explicitly authorizes release to the actual website.

## What changed

- Six existing HTML pages now share forest-noir.css. The homepage receives an actual restaurant photograph, forest overlay, editorial type, gold RSVP CTA, and a framed photograph. Mobile receives its own crop and composition.
- Shared progressive enhancement adds a collapsible mobile navigation and native-dialog venue gallery. Navigation remains visible without JavaScript. Escape closes the menu/dialog; native dialog manages focus.
- Food options become two-column rich cards retaining the existing checkbox/select handlers and quota model. Nonphotographic category artwork avoids claiming to depict individual dishes. The existing category photograph remains explicitly illustrative.
- RSVP controls, identity input and reset are locked during admission checks and submission. Early returns also release the lock. This prevents an in-flight answer from being edited and subsequently labelled confirmed by a response for an earlier answer.
- Guide/Event Pass and Venue share the refined surface, spacing and type system. Existing draft/confirmed/legacy semantics remain owned by the original modules.
- Admin retains its existing authorization, record CRUD, audit and decision engine. It gains a prominent reports entry point and participant search plus RSVP/active-state filters. Export remains independent of those filters.
- New admin-summary.html / admin-summary.js presents a standalone decision brief, 8 food shortlists and all RSVP/gift/theme results. It uses the existing admin JWT endpoints and does not expose a public data API.
- reporting.js builds a 7-CSV ZIP: summary, all food results, shortlist, attendance, gift, theme, participant responses. The main dashboard additionally includes the latest loaded audit JSON, explicitly capped at 100 records.
- The optional ccr-app static proxy allowlist includes the new frontend assets. This is a source change only; deploying that Edge Function is separately required if that entry point is used. GitHub Pages needs no backend schema change.

## Reference translation (scope, not a claim of exhaustive reverse engineering)

Public pages studied: Partiful homepage and a public event detail; Paperless Post homepage and planning content; Linear public homepage/product UI demonstrations; Framer public homepage. Earlier baseline evidence covers the supporting references. Signed-in product workspaces and every modal/state were not inspected.

- Partiful: invitation before administration, poster-led details, friendly RSVP, clear event date and action. CCR already has one event, so the creator-platform homepage is not copied as its information architecture.
- Paperless Post: deliberate hierarchy, editorial typography, restrained framing and whitespace.
- Linear: compact organizer shell, clear navigation, tables and operational labels. No claim of inspecting a real Linear workspace.
- Framer: responsive composition and small interaction polish; no framework replacement or proprietary assets/code copied.

Primary public sources: https://partiful.com/ ; https://www.paperlesspost.com/ ; https://linear.app/ ; https://www.framer.com/ .

## Preserved rules and contracts

A/B/C/E/F: 2 selection units; D/G: 1; H: one selection billed twice. Complete ballot: 13 selected units, 14 billed servings. 56 catalogue options remain unchanged. Fixed allowance remains 200+120=320; budgets 2,000 / 2,200 are decision targets, not hard submission limits. Existing ballot-model.js and decision-engine.js are unchanged.

Participant labels remain optional Unicode display labels, never authentication or cross-device recovery secrets. Browser capabilities and legacy invitation links remain intact. No credentials, Auth settings, RLS, SQL migrations, campaign status, invitations or participant records were changed.

Food shortlist: sort positive scores descending and ID deterministically; select two; select the third only if tied with the second; never exceed three; show a boundary-tie overflow notice. Zero scores are not promoted into winners. Scores are selection-unit votes, not a distinct-human count.

Counts use active invite identities. Responding identities are the union of identities with a ballot or preferences. They are not page visitors or verified unique humans. Visitor tracking is explicitly unmeasured.

Legacy raw choices are exported alongside normalized display choices so normalization cannot erase historical evidence. Prices are reference prices, not a confirmed quotation. All answer rows, including revoked rows, retain their active status in the CSV; summary counts cover active identities.

## Completeness, privacy and failure behavior

Existing submissions endpoint caps invites at 500 and results scans at 10,000. The new full bundle is blocked at those boundaries, on aggregate/row count mismatch, tally mismatch or preference mismatch. It does not silently call a truncated list complete. A future pagination API requires its own reviewed backend change.

API reads are separate requests, not a transactional database snapshot. The summary and metadata report the read time and this limitation. A concurrent same-count update can still create a timing difference; matching counts and tallies provide a consistency guard, not snapshot isolation.

Auth absence, server denial, catalogue version mismatch, catalogue fallback and partial request failure hide the summary and disable export. Refresh failure invalidates the dashboard's bundle-read marker. No secrets appear in export metadata. CSV strings neutralize spreadsheet formula prefixes and quote multiline/Unicode content; CSV files include UTF-8 BOM. ZIP is generated locally without a dependency or external upload.

## Files affected

Existing: index.html, venue.html, party.html, vote.html, guide.html, admin.html, vote.js, party.js, admin.js, package.json, supabase/functions/ccr-app/index.ts.
New: forest-noir.css, forest-noir.js, reporting.js, admin-summary.html, admin-summary.js, tests/reporting.test.mjs, tests/admin-summary.test.mjs, this document.

## Verification completed

- npm test: existing serving/optimizer, release, cloud-client and label suites pass; new report and summary suites pass.
- npm run check: 8 categories, 56 options and existing reference-total constraints pass.
- New report tests cover ties, empty results, deduplicated respondent union, complete-read guards, serving-unit scores, legacy preservation, CSV formula safety and filters.
- New summary tests execute the actual module with mocked read-only dependencies: no session, server denial, empty live-shaped results and partial failure. These are not live production acceptance tests.
- ZIP verified with Python zipfile CRC checks; seven files decode UTF-8/BOM with consistent CSV column widths.
- JavaScript syntax checks and git diff --check pass.

## Required before production release

Browser-rendered visual QA remains pending because the available cloud browser cannot inspect these local project files through the available permitted preview path. The inline review is a source-derived presentation with demo data and no real submission/auth operations; it is not an authenticated E2E test or visual-QA certificate.

Verify actual served pages at 320/360/390/430/768/1024/1280/1440/1920, Thai wrapping, keyboard traversal, Escape/focus return, 200% zoom, reduced motion, table scrolling, full ballots, mixed quantities and H billing. Exercise draft/confirmed/failed/closed/legacy/loading/empty states in an authorized isolated environment. Confirm admin login, logout, token expiry, save/delete permissions and export against controlled fixtures. Do not run production-mutating smoke scripts for visual review.

WCAG 2.2 AA and LCP <=2.5s / INP <=200ms / CLS <=0.1 are goals, not measured passes. No Lighthouse or field CWV result has been claimed.

## Rollback and release scope

Use a review branch/change set when authorized for publication. Keep the baseline SHA as the rollback target. Release frontend assets together, including the versioned new script URLs; update the optional static-proxy allowlist only if releasing that entry point. Rollback restores the affected frontend files and proxy allowlist from the baseline and removes new files. No database rollback is needed because there is no schema/data mutation.

Source implementation and production publication are authorized by the latest owner instruction; owner trial and final acceptance remain separate. No independent reviewer has reviewed this change set.


## Owner-confirmed start time (23 October 2026)

18 December 2026, 17:00 Asia/Bangkok (10:00 UTC). event-time.js centralizes this offset-aware timestamp. Home now displays a live days/hours/minutes/seconds countdown, recalculated from the clock every second and on tab resume; it clamps at zero and announces the event start once. Reduced-motion users receive changing digits without movement. The calendar is timed at 17:00 ICT, with no invented end time and correctly folded UTF-8 content lines. Home, Venue, Guide and sharing copy use the confirmed start. Tests cover UTC alignment, boundaries and calendar byte folding.
