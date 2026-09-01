-- Match the hardening applied to the other coverage helpers: the handover write
-- predicate must not be callable as an RPC by a signed-out client.
-- Version matches remote schema_migrations (applied as estate_handover_revoke_anon).

REVOKE EXECUTE ON FUNCTION public.estate_handover_completion_write_allowed(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.estate_handover_completion_write_allowed(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.estate_handover_completion_write_allowed(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.estate_handover_completion_write_allowed(uuid, uuid) TO service_role;
