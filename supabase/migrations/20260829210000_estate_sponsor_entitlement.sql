-- Estate-scoped entitlement: coverage follows estates.sponsor_user_id.
-- Co-owners inherit host writes only while the estate is covered.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

ALTER TABLE public.estates
  ADD COLUMN IF NOT EXISTS sponsor_user_id uuid;

UPDATE public.estates
SET sponsor_user_id = owner_id
WHERE sponsor_user_id IS NULL;

ALTER TABLE public.estates
  ALTER COLUMN sponsor_user_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'estates_sponsor_user_id_fkey'
  ) THEN
    ALTER TABLE public.estates
      ADD CONSTRAINT estates_sponsor_user_id_fkey
      FOREIGN KEY (sponsor_user_id) REFERENCES auth.users (id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS estates_sponsor_user_id_idx
  ON public.estates (sponsor_user_id);

-- Invite roles: owner -> coOwner
UPDATE public.invitations
SET role = 'coOwner'
WHERE role = 'owner';

UPDATE public.invitations
SET role = 'guest'
WHERE role IS NULL OR role NOT IN ('guest', 'coOwner');

ALTER TABLE public.invitations
  ALTER COLUMN role SET DEFAULT 'guest';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invitations_role_check'
  ) THEN
    ALTER TABLE public.invitations DROP CONSTRAINT invitations_role_check;
  END IF;
  ALTER TABLE public.invitations
    ADD CONSTRAINT invitations_role_check
    CHECK (role IN ('guest', 'coOwner'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Constants / helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.co_owner_cap()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 3 $$;

CREATE OR REPLACE FUNCTION public.user_tier_is_covered(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_user_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.subscription_entitlements se
        WHERE se.user_id = p_user_id
          AND se.entitlement_id IN ('Maison Pro', 'maison_pro')
          AND se.status IN ('active', 'cancelled', 'grace_period')
          AND (se.expires_at IS NULL OR se.expires_at > now())
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = p_user_id
          AND p.trial_ends_at IS NOT NULL
          AND p.trial_ends_at > now()
      )
    );
$$;

REVOKE ALL ON FUNCTION public.user_tier_is_covered(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_tier_is_covered(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_tier_is_covered(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.estate_is_covered(p_estate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_tier_is_covered(e.sponsor_user_id)
  FROM public.estates e
  WHERE e.id = p_estate_id;
$$;

REVOKE ALL ON FUNCTION public.estate_is_covered(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.estate_is_covered(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.estate_is_covered(uuid) TO service_role;

-- sponsor | coOwner | guest | none
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
    ) THEN 'coOwner'
    WHEN EXISTS (
      SELECT 1 FROM public.invitations i
      WHERE i.estate_id = p_estate_id
        AND i.status = 'accepted'
        AND i.guest_id = p_user_id
        AND i.role = 'coOwner'
    ) THEN 'coOwner'
    WHEN EXISTS (
      SELECT 1 FROM public.invitations i
      WHERE i.estate_id = p_estate_id
        AND i.status = 'accepted'
        AND i.guest_id = p_user_id
    ) THEN 'guest'
    ELSE 'none'
  END;
$$;

REVOKE ALL ON FUNCTION public.estate_actor_role(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.estate_actor_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.estate_actor_role(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.estate_co_owner_count(p_estate_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    CASE
      WHEN e.owner_id IS DISTINCT FROM e.sponsor_user_id THEN 1
      ELSE 0
    END
    + (
      SELECT count(*)::int
      FROM public.invitations i
      WHERE i.estate_id = p_estate_id
        AND i.status = 'accepted'
        AND i.role = 'coOwner'
        AND i.guest_id IS DISTINCT FROM e.sponsor_user_id
        AND i.guest_id IS DISTINCT FROM e.owner_id
    )
  )
  FROM public.estates e
  WHERE e.id = p_estate_id;
$$;

REVOKE ALL ON FUNCTION public.estate_co_owner_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.estate_co_owner_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.estate_co_owner_count(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.user_can_create_estate()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.user_has_full_product_access()
    OR (
      (SELECT count(*)::int FROM public.estates e WHERE e.sponsor_user_id = auth.uid()) = 0
    );
$$;

CREATE OR REPLACE FUNCTION public.estate_actor_is_host(p_estate_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.estate_actor_role(p_estate_id, p_user_id) IN ('sponsor', 'coOwner');
$$;

REVOKE ALL ON FUNCTION public.estate_actor_is_host(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.estate_actor_is_host(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.estate_actor_is_host(uuid, uuid) TO service_role;

-- True when host may perform Pro/covered writes on this estate.
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

REVOKE ALL ON FUNCTION public.estate_host_write_allowed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.estate_host_write_allowed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.estate_host_write_allowed(uuid) TO service_role;

-- Basic estate row updates: sponsor always (standard own estate); coOwner only when covered.
CREATE OR REPLACE FUNCTION public.estate_basic_update_allowed(p_estate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE public.estate_actor_role(p_estate_id, auth.uid())
      WHEN 'sponsor' THEN true
      WHEN 'coOwner' THEN coalesce(public.estate_is_covered(p_estate_id), false)
      ELSE false
    END;
$$;

REVOKE ALL ON FUNCTION public.estate_basic_update_allowed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.estate_basic_update_allowed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.estate_basic_update_allowed(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.raise_entitlement_error(p_code text, p_message text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '%', coalesce(p_message, p_code)
    USING ERRCODE = 'P0001',
          DETAIL = p_code;
END;
$$;

-- ---------------------------------------------------------------------------
-- create_estate / transfer / coverage RPC
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
    RETURN json_build_object('ok', false, 'code', 'not_authenticated');
  END IF;

  IF NOT public.user_can_create_estate() THEN
    RETURN json_build_object('ok', false, 'code', 'upgrade_required');
  END IF;

  INSERT INTO public.estates (
    id, owner_id, sponsor_user_id, name, location, description, cover_image_url, time_zone
  )
  VALUES (
    p_id,
    v_uid,
    v_uid,
    p_name,
    p_location,
    p_description,
    p_cover_image_url,
    coalesce(nullif(p_time_zone, ''), 'UTC')
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
  IF v_role <> 'coOwner' THEN
    RETURN json_build_object('ok', false, 'code', 'not_host');
  END IF;

  IF NOT public.user_tier_is_covered(v_uid) THEN
    RETURN json_build_object('ok', false, 'code', 'upgrade_required');
  END IF;

  SELECT sponsor_user_id INTO v_prev FROM public.estates WHERE id = p_estate_id;
  IF v_prev IS NULL THEN
    RETURN json_build_object('ok', false, 'code', 'error', 'message', 'estate_not_found');
  END IF;

  IF v_prev = v_uid THEN
    RETURN json_build_object('ok', true, 'code', 'already_sponsor');
  END IF;

  UPDATE public.estates
  SET sponsor_user_id = v_uid
  WHERE id = p_estate_id;

  RETURN json_build_object('ok', true, 'previous_sponsor_id', v_prev);
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_estate_sponsor(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_estate_sponsor(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.estate_coverage_for_ids(p_ids uuid[])
RETURNS TABLE (
  estate_id uuid,
  covered boolean,
  sponsor_user_id uuid,
  sponsor_display_name text,
  co_owner_count integer,
  actor_role text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id AS estate_id,
    public.user_tier_is_covered(e.sponsor_user_id) AS covered,
    e.sponsor_user_id,
    coalesce(nullif(trim(p.name), ''), 'Sponsor') AS sponsor_display_name,
    coalesce(public.estate_co_owner_count(e.id), 0) AS co_owner_count,
    public.estate_actor_role(e.id, auth.uid()) AS actor_role
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

REVOKE ALL ON FUNCTION public.estate_coverage_for_ids(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.estate_coverage_for_ids(uuid[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- Estates policies
-- ---------------------------------------------------------------------------

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

DROP POLICY IF EXISTS "estates_update_host" ON public.estates;
CREATE POLICY "estates_update_host"
  ON public.estates
  FOR UPDATE
  TO authenticated
  USING (public.estate_basic_update_allowed(id))
  WITH CHECK (public.estate_basic_update_allowed(id));

DROP POLICY IF EXISTS "estates_delete_host" ON public.estates;
CREATE POLICY "estates_delete_host"
  ON public.estates
  FOR DELETE
  TO authenticated
  USING (
    sponsor_user_id = auth.uid()
    AND public.user_has_full_product_access()
  );

-- ---------------------------------------------------------------------------
-- Replace actor-tier restrictive write gates with estate coverage + host role
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "faqs_require_pro_write" ON public.faqs;
DROP POLICY IF EXISTS "faqs_require_pro_modify" ON public.faqs;
DROP POLICY IF EXISTS "faqs_require_pro_delete" ON public.faqs;

CREATE POLICY "faqs_require_covered_host_write"
ON public.faqs AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.estate_host_write_allowed(estate_id));

CREATE POLICY "faqs_require_covered_host_modify"
ON public.faqs AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.estate_host_write_allowed(estate_id))
WITH CHECK (public.estate_host_write_allowed(estate_id));

CREATE POLICY "faqs_require_covered_host_delete"
ON public.faqs AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.estate_host_write_allowed(estate_id));

DROP POLICY IF EXISTS "estate_documents_require_pro_write" ON public.estate_documents;
DROP POLICY IF EXISTS "estate_documents_require_pro_modify" ON public.estate_documents;
DROP POLICY IF EXISTS "estate_documents_require_pro_delete" ON public.estate_documents;

CREATE POLICY "estate_documents_require_covered_host_write"
ON public.estate_documents AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.estate_host_write_allowed(estate_id));

CREATE POLICY "estate_documents_require_covered_host_modify"
ON public.estate_documents AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.estate_host_write_allowed(estate_id))
WITH CHECK (public.estate_host_write_allowed(estate_id));

CREATE POLICY "estate_documents_require_covered_host_delete"
ON public.estate_documents AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.estate_host_write_allowed(estate_id));

DROP POLICY IF EXISTS "estate_contacts_require_pro_write" ON public.estate_contacts;
DROP POLICY IF EXISTS "estate_contacts_require_pro_modify" ON public.estate_contacts;
DROP POLICY IF EXISTS "estate_contacts_require_pro_delete" ON public.estate_contacts;

CREATE POLICY "estate_contacts_require_covered_host_write"
ON public.estate_contacts AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.estate_host_write_allowed(estate_id));

CREATE POLICY "estate_contacts_require_covered_host_modify"
ON public.estate_contacts AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.estate_host_write_allowed(estate_id))
WITH CHECK (public.estate_host_write_allowed(estate_id));

CREATE POLICY "estate_contacts_require_covered_host_delete"
ON public.estate_contacts AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.estate_host_write_allowed(estate_id));

DROP POLICY IF EXISTS "estate_availability_rules_require_pro_write" ON public.estate_availability_rules;
DROP POLICY IF EXISTS "estate_availability_rules_require_pro_modify" ON public.estate_availability_rules;
DROP POLICY IF EXISTS "estate_availability_rules_require_pro_delete" ON public.estate_availability_rules;

CREATE POLICY "estate_availability_rules_require_covered_host_write"
ON public.estate_availability_rules AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.estate_host_write_allowed(estate_id));

CREATE POLICY "estate_availability_rules_require_covered_host_modify"
ON public.estate_availability_rules AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.estate_host_write_allowed(estate_id))
WITH CHECK (public.estate_host_write_allowed(estate_id));

CREATE POLICY "estate_availability_rules_require_covered_host_delete"
ON public.estate_availability_rules AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.estate_host_write_allowed(estate_id));

-- Permissive owner-only policies → also allow co-owners when covered (via WITH CHECK on restrictive).
-- Expand insert/update/delete USING to host role so co-owners pass permissive layer.
DROP POLICY IF EXISTS "estate_availability_rules_insert_owner" ON public.estate_availability_rules;
CREATE POLICY "estate_availability_rules_insert_owner"
ON public.estate_availability_rules FOR INSERT TO authenticated
WITH CHECK (public.estate_actor_is_host(estate_id));

DROP POLICY IF EXISTS "estate_availability_rules_update_owner" ON public.estate_availability_rules;
CREATE POLICY "estate_availability_rules_update_owner"
ON public.estate_availability_rules FOR UPDATE TO authenticated
USING (public.estate_actor_is_host(estate_id))
WITH CHECK (public.estate_actor_is_host(estate_id));

DROP POLICY IF EXISTS "estate_availability_rules_delete_owner" ON public.estate_availability_rules;
CREATE POLICY "estate_availability_rules_delete_owner"
ON public.estate_availability_rules FOR DELETE TO authenticated
USING (public.estate_actor_is_host(estate_id));

DROP POLICY IF EXISTS "stays_require_pro_write" ON public.stays;
DROP POLICY IF EXISTS "stays_require_pro_modify" ON public.stays;
DROP POLICY IF EXISTS "stays_require_pro_delete" ON public.stays;

CREATE POLICY "stays_require_covered_host_write"
ON public.stays AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.estate_host_write_allowed(estate_id));

CREATE POLICY "stays_require_covered_host_modify"
ON public.stays AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.estate_host_write_allowed(estate_id))
WITH CHECK (public.estate_host_write_allowed(estate_id));

CREATE POLICY "stays_require_covered_host_delete"
ON public.stays AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.estate_host_write_allowed(estate_id));

DROP POLICY IF EXISTS "stay_requests_require_pro_for_host_writes" ON public.stay_requests;
CREATE POLICY "stay_requests_require_covered_host_writes"
ON public.stay_requests AS RESTRICTIVE FOR ALL TO authenticated
USING (
  NOT public.estate_actor_is_host(estate_id)
  OR public.estate_host_write_allowed(estate_id)
)
WITH CHECK (
  NOT public.estate_actor_is_host(estate_id)
  OR public.estate_host_write_allowed(estate_id)
);

-- estate_events: gate host writes (guest issue paths remain via existing permissive policies)
DROP POLICY IF EXISTS "estate_events_require_covered_host_write" ON public.estate_events;
DROP POLICY IF EXISTS "estate_events_require_covered_host_modify" ON public.estate_events;
DROP POLICY IF EXISTS "estate_events_require_covered_host_delete" ON public.estate_events;

CREATE POLICY "estate_events_require_covered_host_write"
ON public.estate_events AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (
  -- Guests may still insert issues when permissive policies allow; only bind when host
  NOT public.estate_actor_is_host(estate_id)
  OR public.estate_host_write_allowed(estate_id)
);

CREATE POLICY "estate_events_require_covered_host_modify"
ON public.estate_events AS RESTRICTIVE FOR UPDATE TO authenticated
USING (
  NOT public.estate_actor_is_host(estate_id)
  OR public.estate_host_write_allowed(estate_id)
)
WITH CHECK (
  NOT public.estate_actor_is_host(estate_id)
  OR public.estate_host_write_allowed(estate_id)
);

CREATE POLICY "estate_events_require_covered_host_delete"
ON public.estate_events AS RESTRICTIVE FOR DELETE TO authenticated
USING (
  NOT public.estate_actor_is_host(estate_id)
  OR public.estate_host_write_allowed(estate_id)
);

-- Pending + accepted co-owner seats (for cap checks on invite create/role change)
CREATE OR REPLACE FUNCTION public.estate_co_owner_seat_usage(p_estate_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    CASE
      WHEN e.owner_id IS DISTINCT FROM e.sponsor_user_id THEN 1
      ELSE 0
    END
    + (
      SELECT count(*)::int
      FROM public.invitations i
      WHERE i.estate_id = p_estate_id
        AND i.role = 'coOwner'
        AND i.status IN ('pending', 'accepted')
        AND (i.guest_id IS NULL OR i.guest_id IS DISTINCT FROM e.sponsor_user_id)
        AND (i.guest_id IS NULL OR i.guest_id IS DISTINCT FROM e.owner_id)
    )
  )
  FROM public.estates e
  WHERE e.id = p_estate_id;
$$;

REVOKE ALL ON FUNCTION public.estate_co_owner_seat_usage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.estate_co_owner_seat_usage(uuid) TO authenticated;

-- Invitations: host inserts/role changes need coverage + seat cap.
-- Guest redeem/accept updates must NOT require host coverage.
DROP POLICY IF EXISTS "invitations_require_covered_host_write" ON public.invitations;
DROP POLICY IF EXISTS "invitations_require_covered_host_modify" ON public.invitations;
DROP POLICY IF EXISTS "invitations_require_covered_host_delete" ON public.invitations;

CREATE POLICY "invitations_require_covered_host_write"
ON public.invitations AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (
  public.estate_host_write_allowed(estate_id)
  AND (
    coalesce(role, 'guest') <> 'coOwner'
    OR coalesce(public.estate_co_owner_seat_usage(estate_id), 0) < public.co_owner_cap()
  )
);

CREATE POLICY "invitations_require_covered_host_modify"
ON public.invitations AS RESTRICTIVE FOR UPDATE TO authenticated
USING (
  -- Guests redeeming/accepting are not hosts yet (or are guests); skip gate
  NOT public.estate_actor_is_host(estate_id)
  OR public.estate_host_write_allowed(estate_id)
)
WITH CHECK (
  NOT public.estate_actor_is_host(estate_id)
  OR (
    public.estate_host_write_allowed(estate_id)
    AND (
      coalesce(role, 'guest') <> 'coOwner'
      OR coalesce(public.estate_co_owner_seat_usage(estate_id), 0) <= public.co_owner_cap()
    )
  )
);

CREATE POLICY "invitations_require_covered_host_delete"
ON public.invitations AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.estate_host_write_allowed(estate_id));

-- Storage writes: covered host (sponsor or coOwner)
DROP POLICY IF EXISTS "estate_documents_storage_insert_owner" ON storage.objects;
CREATE POLICY "estate_documents_storage_insert_owner"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'estate-documents'
  AND public.estate_host_write_allowed(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "estate_documents_storage_delete_owner" ON storage.objects;
CREATE POLICY "estate_documents_storage_delete_owner"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'estate-documents'
  AND public.estate_host_write_allowed(((storage.foldername(name))[1])::uuid)
);

COMMENT ON COLUMN public.estates.sponsor_user_id IS
  'User whose trial/Pro subscription covers host capabilities on this estate.';
COMMENT ON FUNCTION public.estate_is_covered(uuid) IS
  'True when the estate sponsor has trial or Maison Pro entitlement.';
COMMENT ON FUNCTION public.transfer_estate_sponsor(uuid) IS
  'Lets a covered co-owner take over sponsorship of an uncovered estate.';

-- ---------------------------------------------------------------------------
-- Extra permissive host-role policies (OR with existing owner_id policies)
-- so co-owners pass the permissive layer; restrictive coverage still binds.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "faqs_write_host_role" ON public.faqs;
CREATE POLICY "faqs_write_host_role"
ON public.faqs FOR ALL TO authenticated
USING (public.estate_actor_is_host(estate_id))
WITH CHECK (public.estate_actor_is_host(estate_id));

DROP POLICY IF EXISTS "estate_contacts_write_host_role" ON public.estate_contacts;
CREATE POLICY "estate_contacts_write_host_role"
ON public.estate_contacts FOR ALL TO authenticated
USING (public.estate_actor_is_host(estate_id))
WITH CHECK (public.estate_actor_is_host(estate_id));

DROP POLICY IF EXISTS "estate_documents_write_host_role" ON public.estate_documents;
CREATE POLICY "estate_documents_write_host_role"
ON public.estate_documents FOR ALL TO authenticated
USING (public.estate_actor_is_host(estate_id))
WITH CHECK (public.estate_actor_is_host(estate_id));

DROP POLICY IF EXISTS "stays_write_host_role" ON public.stays;
CREATE POLICY "stays_write_host_role"
ON public.stays FOR ALL TO authenticated
USING (public.estate_actor_is_host(estate_id))
WITH CHECK (public.estate_actor_is_host(estate_id));

DROP POLICY IF EXISTS "stay_requests_write_host_role" ON public.stay_requests;
CREATE POLICY "stay_requests_write_host_role"
ON public.stay_requests FOR ALL TO authenticated
USING (public.estate_actor_is_host(estate_id))
WITH CHECK (public.estate_actor_is_host(estate_id));

DROP POLICY IF EXISTS "estate_events_write_host_role" ON public.estate_events;
CREATE POLICY "estate_events_write_host_role"
ON public.estate_events FOR ALL TO authenticated
USING (public.estate_actor_is_host(estate_id))
WITH CHECK (public.estate_actor_is_host(estate_id));

DROP POLICY IF EXISTS "invitations_write_host_role" ON public.invitations;
CREATE POLICY "invitations_write_host_role"
ON public.invitations FOR ALL TO authenticated
USING (public.estate_actor_is_host(estate_id))
WITH CHECK (public.estate_actor_is_host(estate_id));

-- Storage select for hosts who are co-owners (not only owner_id)
DROP POLICY IF EXISTS "estate_documents_storage_select_host" ON storage.objects;
CREATE POLICY "estate_documents_storage_select_host"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'estate-documents'
  AND public.estate_actor_is_host(((storage.foldername(name))[1])::uuid)
);
