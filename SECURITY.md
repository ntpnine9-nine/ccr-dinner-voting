# Security Baseline

- Public voters do not create accounts; submission is controlled with high-entropy invitation codes.
- Invitation codes are stored only as SHA-256 hashes in the database.
- The public frontend contains only the Supabase Project URL, publishable key, and campaign ID.
- Service-role/secret keys stay inside Supabase Edge Function environment.
- Admin authentication uses Supabase Auth; authorization additionally requires `public.admin_users` membership.
- RLS is enabled on restricted public-schema tables and direct anon/authenticated table access is revoked.
- Real campaign remains CLOSED until explicit owner approval.
- A previously exposed admin password must be rotated before real admin use. Never store or send the replacement password through chat.
- Release 1 includes best-effort Edge Function per-isolate request throttling plus strict request-size/input validation. Platform-level rate controls may be added later if observed abuse requires them.
