# CCR After Hours 2026 — Event Portal & Dinner Voting

Production-oriented event website for the CCR year-end celebration on **Friday, 18 December 2026** at **ครัวซอย 11, Prawet, Bangkok**.

## Product
One private-shareable event link combines:
- Digital invitation / Save the Date
- Live event guide and run-of-show
- Venue information + Google Maps directions
- Authentic menu reference imagery supplied by the organizer
- RSVP
- Gift Exchange budget poll
- Dress Mood / theme poll
- 8-category / 56-option food voting
- Admin dashboard and menu decision engine

## Architecture
Static public web source → GitHub repository / public delivery gateway → Supabase Edge Functions → Supabase PostgreSQL.

Admin access uses Supabase Auth plus application authorization through `public.admin_users`.

## Public pages
- `index.html` — invitation and event hub
- `venue.html` — venue, map, public venue snapshot, authentic menu references
- `party.html` — RSVP + Gift Exchange + Dress Mood
- `vote.html` — 8-category food vote
- `guide.html` — complete event guide / FAQ
- `admin.html` — authorized organizer dashboard
- `admin-summary.html` — authorized complete-results decision brief

## Voting model
- 8 fixed categories
- 7 menu options per category
- 56 menu candidates
- Serving V2: A/B/C/E/F allow one dish ×2 or two dishes ×1; D/G allow one ×1; H allows one rice choice billed twice
- Complete ballot: 13 selection units / 14 billed servings
- Labels are optional and limited to 80 NFC Unicode code points; they are never authentication
- Standard table budget ≤ THB 2,000
- Premium consideration ≤ THB 2,200
- Gift poll: THB 300 / THB 500 / THB 300–500 / no exchange
- Dress Mood poll: 4 options

## Security / privacy
- Public attendees do not create Supabase accounts.
- Personal invitation codes are high-entropy bearer credentials and stored hashed.
- Re-submission updates the same record before campaign close.
- Individual attendee responses are not shown on public pages.
- Admin actions require authentication plus `admin_users` authorization.
- Owner authorized public voting on 22 October 2026. Open mode accepts a random browser-held capability without a pre-issued invite.

## Availability
The project maintains automated verification for:
- repository integrity
- public gateway HTML/assets
- backend status / CORS
- current campaign admission state

See `SECURITY.md`, `docs/OPERATIONS_TH.md`, and `docs/PRODUCTION_ACCEPTANCE.md`.

## Isolated verification

`npm test` checks business rules, reports, cloud clients and Unicode labels.
`npm run check` also validates all static dependency paths and menu media.

For repeatable browser QA (no live submissions):

```sh
npm ci
npx playwright install --with-deps chromium
git worktree add --detach ../ccr-baseline d3c049e976f53a03937f476b3f2df0e860543e71
npm run test:browser
```

All Supabase requests in browser QA are intercepted using synthetic fixtures.
`QA_BROWSER_EXECUTABLE` can select an installed Chromium executable.
`QA_OUTPUT` selects the evidence directory. Before screenshots reproduce the
historical baseline with a test-only Thai font injection; after screenshots
use the candidate source's own self-hosted fonts. Local lab results are not
field Core Web Vitals, physical-device proof or owner acceptance.

Owner source assets and `assets/menu/` illustrations are distinct. Menu images
are explicitly labelled AI illustrations; 8 of 56 menu items currently have
individual illustrations. Missing images preserve a usable textual selection.
