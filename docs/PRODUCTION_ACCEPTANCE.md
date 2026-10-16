# Production Acceptance — CCR After Hours 2026

## Verified PASS
- [x] Dedicated public GitHub repository and canonical source.
- [x] Supabase project ACTIVE_HEALTHY.
- [x] Auth Admin user exists and application Admin authorization exists.
- [x] Campaign event date = 2026-12-18.
- [x] Campaign remains CLOSED.
- [x] Food catalog = 8 categories × 7 options = 56.
- [x] Invitation / ballot / event-preference production data clean at current checkpoint.
- [x] Food voting backend is active.
- [x] RSVP / Gift / Dress preference backend is active.
- [x] Public event portal pages exist: Home / Venue / Party / Food Vote / Guide.
- [x] Admin Dashboard includes aggregate Food + RSVP + Gift + Dress results.
- [x] Authentic organizer-supplied menu imagery is deployed.
- [x] Google Maps venue embed and destination-only directions are implemented.
- [x] Gift poll has exactly 4 owner-requested choices.
- [x] Dress Mood poll has 4 non-forced options including Come As You Are.
- [x] Same-invite submissions are designed to update existing records.
- [x] Decision Engine supports Popularity / ≤2,000 / ≤2,200 scenarios.
- [x] Automated repository verification passes.
- [x] Automated public gateway HTML/assets smoke tests pass.
- [x] Automated backend closed-campaign smoke test passes.
- [x] Missing FK-index issue was addressed.
- [x] No privileged server secret is intentionally committed to public frontend.

## Launch gates intentionally NOT completed yet
These are not software defects; they depend on final event decisions or explicit owner authorization:
- [ ] Final event start time confirmed.
- [ ] Final attendee / eligible-voter count confirmed.
- [ ] Real invitation codes generated and distributed.
- [ ] Controlled real submission test after launch authorization.
- [ ] Restaurant confirms current price / quantity / table layout / parking / availability.
- [ ] Gift Pairing generated only if Gift Exchange wins and attendee list is final.
- [ ] Owner explicitly authorizes opening real campaign.

## Security advisor
- RLS-with-no-public-policy notices are expected for the deny-by-default server-mediated architecture.
- Supabase currently reports Leaked Password Protection disabled; enable it in Auth settings if available for the project plan.

## Definition
The application baseline is technically deployable and externally smoke-tested while CLOSED.  
Do **not** call the real voting campaign OPEN/LIVE until the owner explicitly approves launch.
