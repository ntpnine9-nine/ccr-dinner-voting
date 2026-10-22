# Security Baseline

- Public voters do not create accounts. The campaign supports invite mode and owner-enabled open mode. Open mode uses a 256-bit random browser-held capability, hashed and domain-separated on the server; it does not prove one human per vote across devices.
- Invitation codes are stored only as SHA-256 hashes in the database.
- The public frontend contains only the Supabase Project URL, publishable key, and campaign ID.
- Service-role/secret keys stay inside Supabase Edge Function environment.
- Admin authentication uses Supabase Auth; authorization additionally requires `public.admin_users` membership.
- RLS is enabled on restricted public-schema tables and direct anon/authenticated table access is revoked.
- Campaign was explicitly authorized to open by the owner on 22 October 2026. Closing it or freezing results continues to block new submissions server-side.
- The owner account password was rotated during recovery. No passwords, hashes, JWTs, device capabilities, or service keys may be committed. Owner credential delivery follows the owner's explicit instructions; subsequent rotation can be performed through Supabase Auth.
- Admin writes and their audit rows use one database transaction. Restricted RPCs are SECURITY INVOKER and executable only by service_role. No master-key login bypass exists.
- Release 1 includes best-effort Edge Function per-isolate request throttling plus strict request-size/input validation. Platform-level rate controls may be added later if observed abuse requires them.
