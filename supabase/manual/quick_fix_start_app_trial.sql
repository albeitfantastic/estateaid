-- Run this in Supabase Dashboard → SQL Editor for the SAME project as EXPO_PUBLIC_SUPABASE_URL.
-- Fixes: "Could not find the function public.start_app_trial without parameters in the schema cache"
-- Safe to run multiple times (idempotent).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

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

COMMENT ON FUNCTION public.start_app_trial() IS 'One-time 14-day app trial; sets profiles.trial_* for auth.uid().';
