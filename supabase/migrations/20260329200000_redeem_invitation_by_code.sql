-- Lets guests redeem an invite code without SELECT on other owners' rows (RLS-safe).
-- Run in Supabase SQL Editor or via `supabase db push` if you use the CLI.

CREATE OR REPLACE FUNCTION public.redeem_invitation_by_code(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  r public.invitations%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  IF p_code IS NULL OR length(trim(p_code)) < 1 THEN
    RETURN json_build_object('ok', false, 'reason', 'invalid_or_used');
  END IF;

  UPDATE public.invitations
  SET
    status = 'accepted',
    guest_id = v_uid,
    responded_at = now()
  WHERE upper(trim(invite_code)) = upper(trim(p_code))
    AND status = 'pending'
  RETURNING * INTO r;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'invalid_or_used');
  END IF;

  RETURN json_build_object(
    'ok', true,
    'row', row_to_json(r)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_invitation_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_invitation_by_code(text) TO authenticated;
