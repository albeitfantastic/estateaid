-- Host/entitlement SECURITY DEFINER RPCs are for authenticated sessions only.
-- Default EXECUTE to PUBLIC/anon was still present on several functions despite
-- earlier REVOKE ALL FROM PUBLIC + GRANT TO authenticated patterns.

REVOKE EXECUTE ON FUNCTION public.user_has_full_product_access() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_has_full_product_access() FROM anon;
GRANT EXECUTE ON FUNCTION public.user_has_full_product_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_full_product_access() TO service_role;

REVOKE EXECUTE ON FUNCTION public.user_has_active_entitlement(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.start_app_trial() FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_can_create_estate() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_estate(uuid, text, text, text, text, text) FROM anon;

REVOKE EXECUTE ON FUNCTION public.user_tier_is_covered(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.estate_is_covered(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.estate_actor_role(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.estate_co_owner_count(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.estate_actor_is_host(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.estate_host_write_allowed(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.estate_basic_update_allowed(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.transfer_estate_sponsor(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.estate_coverage_for_ids(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.estate_co_owner_seat_usage(uuid) FROM anon;

-- Invite redeem is authenticated-only by design.
REVOKE EXECUTE ON FUNCTION public.redeem_invitation_by_code(text) FROM anon;

-- Harden helper DEFINER functions that advisors flag for mutable search_path.
ALTER FUNCTION public.co_owner_cap() SET search_path = public, pg_temp;
ALTER FUNCTION public.raise_entitlement_error(text, text) SET search_path = public, pg_temp;
