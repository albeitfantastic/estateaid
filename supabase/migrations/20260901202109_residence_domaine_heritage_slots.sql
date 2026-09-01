-- Résidence / Domaine / Héritage slot packs (1 / 3 / 7).
-- Resolve slots from the active store product first; entitlement is a fallback.

CREATE OR REPLACE FUNCTION public.product_id_to_slots(p_product_id text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE p_product_id
    WHEN 'residence_annual' THEN 1
    WHEN 'residence_monthly' THEN 1
    WHEN 'home_annual' THEN 1
    WHEN 'home_monthly' THEN 1
    WHEN 'domaine_annual' THEN 3
    WHEN 'domaine_monthly' THEN 3
    WHEN 'family_annual' THEN 3
    WHEN 'family_monthly' THEN 3
    WHEN 'heritage_annual' THEN 7
    WHEN 'heritage_monthly' THEN 7
    WHEN 'portfolio_annual' THEN 7
    WHEN 'portfolio_monthly' THEN 7
    ELSE 0
  END;
$$;

COMMENT ON FUNCTION public.product_id_to_slots(text) IS
  'Integer slot count for a RevenueCat / App Store product id (1, 3, or 7).';

CREATE OR REPLACE FUNCTION public.entitlement_id_to_slots(p_entitlement_id text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE p_entitlement_id
    WHEN 'Maison Home' THEN 1
    WHEN 'maison_home' THEN 1
    WHEN 'Maison Résidence' THEN 1
    WHEN 'Maison Residence' THEN 1
    WHEN 'Maison Family' THEN 3
    WHEN 'maison_family' THEN 3
    WHEN 'Maison Domaine' THEN 3
    WHEN 'Maison Portfolio' THEN 7
    WHEN 'maison_portfolio' THEN 7
    WHEN 'Maison Héritage' THEN 7
    WHEN 'Maison Heritage' THEN 7
    WHEN 'Maison Pro' THEN 1
    WHEN 'maison_pro' THEN 1
    ELSE 0
  END;
$$;

COMMENT ON FUNCTION public.entitlement_id_to_slots(text) IS
  'Fallback slot count from RC entitlement lookup key. Prefer product_id_to_slots.';

COMMENT ON FUNCTION public.trial_slot_count() IS
  'Slots granted during an active app trial. Matches Domaine pack (3).';

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
        SELECT max(greatest(
          public.product_id_to_slots(se.product_id),
          public.entitlement_id_to_slots(se.entitlement_id)
        ))
        FROM public.subscription_entitlements se
        WHERE se.user_id = p_user_id
          AND se.status IN ('active', 'cancelled', 'grace_period', 'billing_issue')
          AND (se.expires_at IS NULL OR se.expires_at > now())
          AND greatest(
            public.product_id_to_slots(se.product_id),
            public.entitlement_id_to_slots(se.entitlement_id)
          ) > 0
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
  'Resolved slot count from the active store product (then entitlement) + trial + grandfathered_slots.';
