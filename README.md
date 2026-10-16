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

## Voting model
- 8 fixed categories
- 7 menu options per category
- 56 menu candidates
- 1 choice per category per ballot
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
- Campaign remains CLOSED until explicit owner launch approval.

## Availability
The project maintains automated verification for:
- repository integrity
- public gateway HTML/assets
- backend status / CORS
- campaign closed launch gate

See `SECURITY.md`, `docs/OPERATIONS_TH.md`, and `docs/PRODUCTION_ACCEPTANCE.md`.
