-- create / transfer / elect coverage.
-- Version matches remote schema_migrations (applied as slot_economy_create_elect).

CREATE OR REPLACE FUNCTION public.create_estate(
  p_id uuid,
  p_name text,
  p_location text,
  p_description text DEFAULT NULL,
  p_cover_image_url text DEFAULT NULL,
  p_time_zone text DEFAULT 'UTC'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'code', 'NO_FREE_SLOT');
  END IF;

  IF NOT public.user_can_create_estate() THEN
    RETURN json_build_object('ok', false, 'code', 'NO_FREE_SLOT');
  END IF;

  INSERT INTO public.estates (
    id, owner_id, sponsor_user_id, name, location, description, cover_image_url, time_zone, slot_held
  )
  VALUES (
    p_id, v_uid, v_uid, p_name, p_location, p_description, p_cover_image_url,
    coalesce(nullif(p_time_zone, ''), 'UTC'), true
  );

  RETURN json_build_object('ok', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('ok', false, 'code', 'conflict');
  WHEN OTHERS THEN
    RETURN json_build_object('ok', false, 'code', 'error', 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_estate_sponsor(p_estate_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_prev uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'code', 'not_authenticated');
  END IF;

  v_role := public.estate_actor_role(p_estate_id, v_uid);
  IF v_role <> 'owner' THEN
    RETURN json_build_object('ok', false, 'code', 'NOT_SPONSOR');
  END IF;

  IF public.user_slot_count(v_uid) <= public.user_properties_sponsored(v_uid) THEN
    RETURN json_build_object('ok', false, 'code', 'NO_FREE_SLOT');
  END IF;

  SELECT sponsor_user_id INTO v_prev FROM public.estates WHERE id = p_estate_id;
  IF v_prev IS NULL THEN
    RETURN json_build_object('ok', false, 'code', 'error', 'message', 'estate_not_found');
  END IF;

  IF v_prev = v_uid THEN
    RETURN json_build_object('ok', true, 'code', 'already_sponsor');
  END IF;

  UPDATE public.estates
  SET sponsor_user_id = v_uid, slot_held = true
  WHERE id = p_estate_id;

  RETURN json_build_object('ok', true, 'previous_sponsor_id', v_prev);
END;
$$;

CREATE OR REPLACE FUNCTION public.elect_covered_estates(p_estate_ids uuid[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_slots int;
  v_n int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'code', 'not_authenticated');
  END IF;

  v_slots := public.user_slot_count(v_uid);
  v_n := coalesce(array_length(p_estate_ids, 1), 0);

  IF v_n > v_slots THEN
    RETURN json_build_object('ok', false, 'code', 'NO_FREE_SLOT');
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(coalesce(p_estate_ids, array[]::uuid[])) AS x(id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.estates e WHERE e.id = x.id AND e.sponsor_user_id = v_uid
    )
  ) THEN
    RETURN json_build_object('ok', false, 'code', 'NOT_SPONSOR');
  END IF;

  UPDATE public.estates SET slot_held = false WHERE sponsor_user_id = v_uid;
  UPDATE public.estates SET slot_held = true
  WHERE sponsor_user_id = v_uid AND id = ANY (coalesce(p_estate_ids, array[]::uuid[]));

  RETURN json_build_object('ok', true, 'held', v_n, 'slots', v_slots);
END;
$$;

REVOKE ALL ON FUNCTION public.elect_covered_estates(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.elect_covered_estates(uuid[]) TO authenticated;
