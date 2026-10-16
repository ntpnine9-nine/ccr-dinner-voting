REVOKE ALL ON FUNCTION public.guard_active_catalog_mutation() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guard_active_catalog_mutation() TO service_role;
CREATE INDEX IF NOT EXISTS idx_admin_action_user ON public.admin_action_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ballot_audit_ballot ON public.ballot_audit_events(ballot_id);
CREATE INDEX IF NOT EXISTS idx_ballot_audit_invite ON public.ballot_audit_events(invite_id);
