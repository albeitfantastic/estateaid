-- Align Pro entitlement id with RevenueCat dashboard Identifier "Maison Pro"
-- (app previously expected maison_pro, which never matched SDK / webhook rows).

CREATE OR REPLACE FUNCTION public.user_has_full_product_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.subscription_entitlements se
      WHERE se.user_id = auth.uid()
        AND se.entitlement_id IN ('Maison Pro', 'maison_pro')
        AND se.status IN ('active', 'cancelled', 'grace_period')
        AND (se.expires_at IS NULL OR se.expires_at > now())
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.trial_ends_at IS NOT NULL
        AND p.trial_ends_at > now()
    );
$$;

COMMENT ON FUNCTION public.user_has_full_product_access() IS
  'True if user has Pro entitlement (Maison Pro / maison_pro mirror) or an active app trial window.';
