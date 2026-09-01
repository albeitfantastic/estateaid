-- Slot / owner-cap helpers.
-- Version matches remote schema_migrations (applied as slot_economy_helpers).

CREATE OR REPLACE FUNCTION public.owner_cap()
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$ SELECT 4 $$;

CREATE OR REPLACE FUNCTION public.co_owner_cap()
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$ SELECT 3 $$;

CREATE OR REPLACE FUNCTION public.entitlement_id_to_slots(p_entitlement_id text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE p_entitlement_id
    WHEN 'Maison Home' THEN 1
    WHEN 'maison_home' THEN 1
    WHEN 'Maison Family' THEN 3
    WHEN 'maison_family' THEN 3
    WHEN 'Maison Portfolio' THEN 10
    WHEN 'maison_portfolio' THEN 10
    WHEN 'Maison Pro' THEN 1
    WHEN 'maison_pro' THEN 1
    ELSE 0
  END;
$$;

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
      ) THEN 1
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

CREATE OR REPLACE FUNCTION public.user_properties_sponsored(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM public.estates e WHERE e.sponsor_user_id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.user_properties_sponsored(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_properties_sponsored(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_properties_sponsored(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.user_is_over_allocated(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_properties_sponsored(p_user_id) > public.user_slot_count(p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.user_tier_is_covered(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_slot_count(p_user_id) > 0;
$$;

CREATE OR REPLACE FUNCTION public.estate_is_covered(p_estate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.sponsor_user_id IS NOT NULL
    AND public.user_slot_count(e.sponsor_user_id) > 0
    AND (
      NOT public.user_is_over_allocated(e.sponsor_user_id)
      OR e.slot_held
    )
  FROM public.estates e
  WHERE e.id = p_estate_id;
$$;

CREATE OR REPLACE FUNCTION public.user_can_create_estate()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_slot_count(auth.uid()) > public.user_properties_sponsored(auth.uid());
$$;
