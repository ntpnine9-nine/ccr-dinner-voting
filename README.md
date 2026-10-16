# CCR Dinner Voting & Menu Decision Management System

Production-oriented Release 1 for CCR year-end dinner voting at ครัวซอย 11.

## Architecture
Public GitHub Pages → Supabase Edge Function → Supabase PostgreSQL

Admin: Supabase Auth + `public.admin_users` authorization.

## Product model
- 8 fixed categories
- 7 options/category
- 56 menu candidates
- 1 option/category/ballot
- Standard budget ≤ THB 2,000
- Premium consideration ≤ THB 2,200

## Public UX
No voter account login. Link/QR → A-H selections → review → personal invitation code → submit → server receipt.

## Deployment
Target public URL: `https://ntpnine9-nine.github.io/ccr-dinner-voting/`
Target admin URL: `https://ntpnine9-nine.github.io/ccr-dinner-voting/admin.html`

The real campaign must remain CLOSED until acceptance testing passes and the owner explicitly approves launch.

See `SECURITY.md` and `docs/OPERATIONS_TH.md`.
