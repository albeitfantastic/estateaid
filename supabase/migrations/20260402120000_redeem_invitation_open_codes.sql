-- Open invites: guest_email NULL or blank = any authenticated user with a session email may redeem once.
-- Locked invites: non-empty guest_email must match JWT email (case-insensitive).

CREATE OR REPLACE FUNCTION public.redeem_invitation_by_code(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  r public.invitations%ROWTYPE;
  r_pending public.invitations%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  v_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));

  IF length(v_email) < 1 THEN
    RETURN json_build_object('ok', false, 'reason', 'no_session_email');
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
    AND (
      guest_email IS NULL
      OR btrim(guest_email) = ''
      OR lower(btrim(guest_email)) = v_email
    )
  RETURNING * INTO r;

  IF FOUND THEN
    RETURN json_build_object('ok', true, 'row', row_to_json(r));
  END IF;

  SELECT * INTO r_pending
  FROM public.invitations
  WHERE upper(trim(invite_code)) = upper(trim(p_code))
    AND status = 'pending'
  LIMIT 1;

  IF FOUND THEN
    IF r_pending.guest_email IS NOT NULL
       AND btrim(r_pending.guest_email) <> ''
       AND lower(btrim(r_pending.guest_email)) <> v_email THEN
      RETURN json_build_object('ok', false, 'reason', 'wrong_invitee');
    END IF;
    RETURN json_build_object('ok', false, 'reason', 'invalid_or_used');
  END IF;

  RETURN json_build_object('ok', false, 'reason', 'invalid_or_used');
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_invitation_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_invitation_by_code(text) TO authenticated;
