-- Coverage RPC, estate insert/delete policies, owner-cap trigger.
-- Version matches remote schema_migrations (applied as slot_economy_coverage_drop_recreate).

DROP FUNCTION IF EXISTS public.estate_coverage_for_ids(uuid[]);

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

REVOKE ALL ON FUNCTION public.estate_coverage_for_ids(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.estate_coverage_for_ids(uuid[]) TO authenticated;

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

CREATE OR REPLACE FUNCTION public.estate_co_owner_seat_usage(p_estate_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.estate_co_owner_count(p_estate_id);
$$;
