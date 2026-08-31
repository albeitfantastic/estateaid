-- Match the hardening applied to the other coverage helpers: the handover write
-- predicate must not be callable as an RPC by a signed-out client.

REVOKE EXECUTE ON FUNCTION public.estate_handover_completion_write_allowed(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.estate_handover_completion_write_allowed(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.estate_handover_completion_write_allowed(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.estate_handover_completion_write_allowed(uuid, uuid) TO service_role;
