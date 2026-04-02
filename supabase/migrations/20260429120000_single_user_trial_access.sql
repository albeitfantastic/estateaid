-- Single-user model: trial window + subscription; remove profiles.role.
-- Trial source of truth: profiles.trial_* (14 days). Pro: subscription_entitlements + user_has_active_entitlement.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Drop account role; access is subscription + trial only.
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

COMMENT ON COLUMN public.profiles.trial_started_at IS 'Set when user starts app free trial.';
COMMENT ON COLUMN public.profiles.trial_ends_at IS 'Trial expiry; full host features while now() < trial_ends_at (with active trial).';

-- Active Pro entitlement (same logic as user_has_active_entitlement) OR active trial window.
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
        AND se.entitlement_id = 'maison_pro'
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

REVOKE ALL ON FUNCTION public.user_has_full_product_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_full_product_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_full_product_access() TO service_role;

COMMENT ON FUNCTION public.user_has_full_product_access() IS
  'True if user has Pro entitlement (mirrored) or an active app trial window.';

-- One-time trial start (idempotent: only if trial never started).
CREATE OR REPLACE FUNCTION public.start_app_trial()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_uid AND p.trial_started_at IS NOT NULL
  ) THEN
    RETURN json_build_object('ok', false, 'reason', 'trial_already_started');
  END IF;

  UPDATE public.profiles
  SET
    trial_started_at = now(),
    trial_ends_at = now() + interval '14 days'
  WHERE id = v_uid;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'profile_missing');
  END IF;

  RETURN json_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.start_app_trial() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_app_trial() TO authenticated;

-- Host mutations on estates: only when full access (Pro or trial).
DROP POLICY IF EXISTS "estates_insert_host" ON public.estates;
CREATE POLICY "estates_insert_host"
  ON public.estates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND public.user_has_full_product_access()
  );

DROP POLICY IF EXISTS "estates_update_host" ON public.estates;
CREATE POLICY "estates_update_host"
  ON public.estates
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    AND public.user_has_full_product_access()
  )
  WITH CHECK (
    owner_id = auth.uid()
    AND public.user_has_full_product_access()
  );

DROP POLICY IF EXISTS "estates_delete_host" ON public.estates;
CREATE POLICY "estates_delete_host"
  ON public.estates
  FOR DELETE
  TO authenticated
  USING (
    owner_id = auth.uid()
    AND public.user_has_full_product_access()
  );

-- Ensure RLS is on (idempotent); owner can always read own rows (e.g. locked Standard tier).
ALTER TABLE public.estates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estates_select_own_row" ON public.estates;
CREATE POLICY "estates_select_own_row"
  ON public.estates
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());
