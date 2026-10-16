# Production Acceptance — Current Checkpoint

## Verified PASS
- [x] Dedicated public GitHub repository exists and production source has been uploaded.
- [x] Supabase project ACTIVE_HEALTHY.
- [x] Database contains 8 categories × 7 options = 56.
- [x] Real campaign remains CLOSED.
- [x] Invitation/ballot tables clean: 0 real invites, 0 real ballots at checkpoint.
- [x] Vote Edge Function v2 ACTIVE.
- [x] GitHub Edge Function source exactly matches deployed v2 source.
- [x] Forward migrations recorded in GitHub and Supabase migration history.
- [x] Atomic database ballot test passed.
- [x] Same-invite update test passed: one ballot, two audit events, latest choices retained.
- [x] Catalog/Decision Engine static test passed.
- [x] DOM element reference audit passed for voter/admin pages.
- [x] No missing FK-index advisory remains.
- [x] No privileged secret literal intentionally committed to public frontend.

## Awaiting external/owner gate
- [ ] GitHub Pages publishing source enabled and public URL externally verified.
- [ ] Previously exposed Auth password rotated by owner.
- [ ] Owner explicitly approves current Auth user for `public.admin_users`.
- [ ] Admin login + authorization tested through live browser.
- [ ] Controlled Edge Function HTTP E2E test through live website.
- [ ] Android external-device test.
- [ ] iOS Safari external-device test or explicitly accepted as pending.
- [ ] Real launch eligible-voter count confirmed.
- [ ] Real invitation codes generated/distributed after approval.
- [ ] QR generated from verified production URL.
- [ ] Owner explicitly authorizes opening real campaign.

## Advisor note
Supabase currently reports Leaked Password Protection disabled. Consider enabling it in Auth security settings where available. Direct public table access remains intentionally deny-by-default via RLS with no anon/auth policies; application data access is mediated through Edge Function server logic.

Do not label the product LIVE until the remaining gates pass.
