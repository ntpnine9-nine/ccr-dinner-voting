# Production Recovery — 22 October 2026

## Verified architecture and deployment

- Supabase project `vjvptuecwewmqhkedybs` is ACTIVE_HEALTHY.
- Existing owner account is confirmed and present in `public.admin_users`. The supplied old password did not match its stored bcrypt hash; a new randomly generated password was set and tested against Auth.
- Campaign `ccr-2026` is OPEN with `voting_mode=open`, eligible target 50, budgets THB 2,000 / 2,200.
- Migration `20261022034914_open_voting_and_atomic_admin_operations.sql` is applied. It adds service-only, SECURITY INVOKER RPCs. Anonymous/authenticated direct execution is denied, service_role execution is allowed.
- Public submissions create/reuse their hashed random browser identity transactionally. Invalid submissions roll back identity creation. Existing invitation submissions remain supported.
- All ten admin mutations use one RPC transaction for data changes and their audit row. JWT validation plus admin membership remains required. No master-key bypass was added.
- Login is the default admin screen. Preview is opt-in. The authenticated dashboard polls every 20 seconds, shows central submissions/audit, and supports CSV/JSON export.
- Public forms require a confirmed server response; drafts and clearing local choices do not claim to delete central data.
- Browser assets use a release query string to avoid loading a mixed cached module graph.
- Existing repository regression tests, new client identity/error tests, catalog check, JavaScript syntax checks and whitespace checks pass.

## Live verification

Run details are in `CLOUD_RECOVERY_RECEIPT.json`. The live smoke script verifies owner password login, role checks, anonymous admin denial, central ballot/RSVP persistence, a second independent participant, stable re-submission, admin edits/deletes, invitation compatibility/revocation, and removal of its disposable votes. It does not represent a physical mobile-device test or human owner acceptance.

## Limits

Open voting remembers a browser capability, not a verified human identity. Another device or cleared browser storage can create another participant. Cross-device reuse requires a personal invitation code. Throttling is best-effort per Edge isolate, as in the existing system.

The initial deployed cloud database did not contain any ballots, preferences, or invitations. Prior local drafts and preview records are not silently imported into real totals. Their owners must resubmit through the live forms if wanted.

The pre-existing `20261018140000_audit_hardening.sql` file is not present in remote migration history and was not applied in this recovery: its preference definition uses a different schema contract. Do not blindly replay legacy unapplied migrations into this live project. The new migration targets the inspected live schema.

Existing Supabase advisor notices: RLS with no policies is expected here because direct table grants are revoked and writes are server-mediated. Leaked Password Protection remains disabled; see https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

Owner still confirms final event time, attendee count, restaurant pricing/portions and final acceptance using their own devices. No real attendee data was deleted during recovery.
