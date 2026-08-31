-- Slot economy (§2–§4, §16): integer slots, owner role, has_used_trial, coverage election.

-- ---------------------------------------------------------------------------
-- Profiles: trial once + grandfather slots for legacy Pro subscribers
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_used_trial boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS grandfathered_slots integer;

UPDATE public.profiles
SET has_used_trial = true
WHERE trial_ends_at IS NOT NULL
  AND coalesce(has_used_trial, false) = false;

UPDATE public.profiles p
SET grandfathered_slots = greatest(
  coalesce(grandfathered_slots, 0),
  (
    SELECT count(*)::int
    FROM public.estates e
    WHERE e.sponsor_user_id = p.id
  ),
  1
)
WHERE EXISTS (
  SELECT 1
  FROM public.subscription_entitlements se
  WHERE se.user_id = p.id
    AND se.entitlement_id IN ('Maison Pro', 'maison_pro')
    AND se.status IN ('active', 'cancelled', 'grace_period', 'billing_issue')
    AND (se.expires_at IS NULL OR se.expires_at > now())
);

-- ---------------------------------------------------------------------------
-- Estates: per-property slot election when over-allocated
-- ---------------------------------------------------------------------------

ALTER TABLE public.estates
  ADD COLUMN IF NOT EXISTS slot_held boolean NOT NULL DEFAULT true;

UPDATE public.estates SET sponsor_user_id = owner_id WHERE sponsor_user_id IS NULL;

-- ---------------------------------------------------------------------------
-- Invite roles: coOwner → owner (UI "owner"; sponsor is not an invite role)
-- ---------------------------------------------------------------------------

UPDATE public.invitations SET role = 'owner' WHERE role IN ('coOwner', 'owner');
UPDATE public.invitations SET role = 'guest' WHERE role IS NULL OR role NOT IN ('guest', 'owner');

ALTER TABLE public.invitations ALTER COLUMN role SET DEFAULT 'guest';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invitations_role_check') THEN
    ALTER TABLE public.invitations DROP CONSTRAINT invitations_role_check;
  END IF;
  ALTER TABLE public.invitations
    ADD CONSTRAINT invitations_role_check CHECK (role IN ('guest', 'owner'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Slot / owner-cap helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.owner_cap()
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$ SELECT 4 $$;  -- includes sponsor

-- Keep co_owner_cap as alias for invited owners only (owner_cap - 1)
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
    -- Legacy boolean Pro: treat as at least 1; grandfathered_slots may raise further
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

-- Covered: sponsor has slots, and either not over-allocated or this estate holds a slot.
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

-- ---------------------------------------------------------------------------
-- Roles: sponsor | owner | guest | none
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.estate_actor_role(p_estate_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_user_id IS NULL THEN 'none'
    WHEN EXISTS (
      SELECT 1 FROM public.estates e
      WHERE e.id = p_estate_id AND e.sponsor_user_id = p_user_id
    ) THEN 'sponsor'
    WHEN EXISTS (
      SELECT 1 FROM public.estates e
      WHERE e.id = p_estate_id AND e.owner_id = p_user_id
        AND e.sponsor_user_id IS DISTINCT FROM p_user_id
    ) THEN 'owner'
    WHEN EXISTS (
      SELECT 1 FROM public.invitations i
      WHERE i.estate_id = p_estate_id
        AND i.status = 'accepted'
        AND i.guest_id = p_user_id
        AND i.role = 'owner'
    ) THEN 'owner'
    WHEN EXISTS (
      SELECT 1 FROM public.invitations i
      WHERE i.estate_id = p_estate_id
        AND i.status = 'accepted'
        AND i.guest_id = p_user_id
    ) THEN 'guest'
    ELSE 'none'
  END;
$$;

-- Owner-role holders including sponsor (for OWNER_CAP)
CREATE OR REPLACE FUNCTION public.estate_owner_count(p_estate_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    1  -- sponsor
    + CASE
        WHEN e.owner_id IS DISTINCT FROM e.sponsor_user_id THEN 1
        ELSE 0
      END
    + (
      SELECT count(*)::int
      FROM public.invitations i
      WHERE i.estate_id = p_estate_id
        AND i.status IN ('accepted', 'pending')
        AND i.role = 'owner'
        AND i.guest_id IS DISTINCT FROM e.sponsor_user_id
        AND i.guest_id IS DISTINCT FROM e.owner_id
    )
  )
  FROM public.estates e
  WHERE e.id = p_estate_id;
$$;

REVOKE ALL ON FUNCTION public.estate_owner_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.estate_owner_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.estate_owner_count(uuid) TO service_role;

-- Back-compat name used by older policies
CREATE OR REPLACE FUNCTION public.estate_co_owner_count(p_estate_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT greatest(public.estate_owner_count(p_estate_id) - 1, 0);
$$;

CREATE OR REPLACE FUNCTION public.estate_actor_is_host(p_estate_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.estate_actor_role(p_estate_id, p_user_id) IN ('sponsor', 'owner');
$$;

CREATE OR REPLACE FUNCTION public.estate_host_write_allowed(p_estate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.estate_actor_is_host(p_estate_id, auth.uid())
    AND coalesce(public.estate_is_covered(p_estate_id), false);
$$;

CREATE OR REPLACE FUNCTION public.estate_basic_update_allowed(p_estate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE public.estate_actor_role(p_estate_id, auth.uid())
    WHEN 'sponsor' THEN true
    WHEN 'owner' THEN coalesce(public.estate_is_covered(p_estate_id), false)
    ELSE false
  END;
$$;

-- ---------------------------------------------------------------------------
-- Trial: 14 days, once ever (has_used_trial)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.start_app_trial()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ends timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'code', 'not_authenticated');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_uid AND (p.has_used_trial OR (p.trial_ends_at IS NOT NULL))
  ) THEN
    RETURN json_build_object('ok', false, 'code', 'TRIAL_ALREADY_USED');
  END IF;

  v_ends := now() + interval '14 days';
  UPDATE public.profiles
  SET
    trial_started_at = now(),
    trial_ends_at = v_ends,
    has_used_trial = true
  WHERE id = v_uid;

  RETURN json_build_object('ok', true, 'trial_ends_at', v_ends);
END;
$$;

-- ---------------------------------------------------------------------------
-- create / transfer / elect coverage
-- ---------------------------------------------------------------------------

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

-- Sponsor elects which properties keep coverage when over-allocated
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

CREATE OR REPLACE FUNCTION public.estate_coverage_for_ids(p_ids uuid[])
RETURNS TABLE (
  estate_id uuid,
  covered boolean,
  sponsor_user_id uuid,
  sponsor_display_name text,
  co_owner_count integer,
  owner_count integer,
  actor_role text,
  slot_held boolean,
  sponsor_over_allocated boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id AS estate_id,
    public.estate_is_covered(e.id) AS covered,
    e.sponsor_user_id,
    coalesce(nullif(trim(p.name), ''), 'Sponsor') AS sponsor_display_name,
    coalesce(public.estate_co_owner_count(e.id), 0) AS co_owner_count,
    coalesce(public.estate_owner_count(e.id), 0) AS owner_count,
    public.estate_actor_role(e.id, auth.uid()) AS actor_role,
    e.slot_held,
    public.user_is_over_allocated(e.sponsor_user_id) AS sponsor_over_allocated
  FROM public.estates e
  LEFT JOIN public.profiles p ON p.id = e.sponsor_user_id
  WHERE e.id = ANY (p_ids)
    AND (
      e.owner_id = auth.uid()
      OR e.sponsor_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.invitations i
        WHERE i.estate_id = e.id
          AND i.status = 'accepted'
          AND i.guest_id = auth.uid()
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- Policies: delete = sponsor only; owner invites capped
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "estates_delete_host" ON public.estates;
CREATE POLICY "estates_delete_host"
  ON public.estates
  FOR DELETE
  TO authenticated
  USING (sponsor_user_id = auth.uid());

DROP POLICY IF EXISTS "estates_insert_host" ON public.estates;
CREATE POLICY "estates_insert_host"
  ON public.estates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND sponsor_user_id = auth.uid()
    AND public.user_can_create_estate()
  );

-- Invitation role updates / inserts for owners
DROP POLICY IF EXISTS "invitations_owner_role_cap" ON public.invitations;
-- Enforce via trigger for clearer error codes

CREATE OR REPLACE FUNCTION public.invitations_enforce_owner_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  IF NEW.role = 'owner' AND (TG_OP = 'INSERT' OR NEW.role IS DISTINCT FROM OLD.role) THEN
    IF NOT coalesce(public.estate_is_covered(NEW.estate_id), false) THEN
      PERFORM public.raise_entitlement_error('PROPERTY_UNCOVERED', 'PROPERTY_UNCOVERED');
    END IF;
    v_role := public.estate_actor_role(NEW.estate_id, auth.uid());
    IF v_role <> 'sponsor' THEN
      PERFORM public.raise_entitlement_error('NOT_SPONSOR', 'NOT_SPONSOR');
    END IF;
    IF public.estate_owner_count(NEW.estate_id) >= public.owner_cap() THEN
      PERFORM public.raise_entitlement_error('OWNER_CAP_REACHED', 'OWNER_CAP_REACHED');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invitations_enforce_owner_cap_trg ON public.invitations;
CREATE TRIGGER invitations_enforce_owner_cap_trg
  BEFORE INSERT OR UPDATE OF role ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.invitations_enforce_owner_cap();

-- Seat usage helper used by older RLS
CREATE OR REPLACE FUNCTION public.estate_co_owner_seat_usage(p_estate_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.estate_co_owner_count(p_estate_id);
$$;

COMMENT ON FUNCTION public.user_slot_count(uuid) IS
  'Resolved slot count from RC entitlements + active trial + grandfathered_slots.';
COMMENT ON FUNCTION public.estate_is_covered(uuid) IS
  'True when sponsor has slots and (not over-allocated or estate.slot_held).';
