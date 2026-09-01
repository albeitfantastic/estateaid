-- Trial grants Family pack (3 slots) so testers can create three properties.
-- Version matches remote schema_migrations (applied as trial_family_slots).

CREATE OR REPLACE FUNCTION public.trial_slot_count()
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$ SELECT 3 $$;

COMMENT ON FUNCTION public.trial_slot_count() IS
  'Slots granted during an active app trial. Matches Family pack (3) for testing.';

CREATE OR REPLACE FUNCTION public.user_slot_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT greatest(
    coalesce(
      (
        SELECT max(public.entitlement_id_to_slots(se.entitlement_id))
        FROM public.subscription_entitlements se
        WHERE se.user_id = p_user_id
          AND se.status IN ('active', 'cancelled', 'grace_period', 'billing_issue')
          AND (se.expires_at IS NULL OR se.expires_at > now())
          AND public.entitlement_id_to_slots(se.entitlement_id) > 0
      ),
      0
    ),
    CASE
      WHEN EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = p_user_id
          AND p.trial_ends_at IS NOT NULL
          AND p.trial_ends_at > now()
      ) THEN public.trial_slot_count()
      ELSE 0
    END,
    coalesce(
      (SELECT p.grandfathered_slots FROM public.profiles p WHERE p.id = p_user_id),
      0
    )
  );
$$;

REVOKE ALL ON FUNCTION public.user_slot_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_slot_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_slot_count(uuid) TO service_role;

COMMENT ON FUNCTION public.user_slot_count(uuid) IS
  'Resolved slot count from RC entitlements + active trial (trial_slot_count) + grandfathered_slots.';
