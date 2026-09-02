-- Offline (no-app) guests can belong to several properties at once.

ALTER TABLE public.estate_guest_profiles
  ADD COLUMN estate_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

UPDATE public.estate_guest_profiles
SET estate_ids = ARRAY[estate_id]
WHERE cardinality(estate_ids) = 0;

ALTER TABLE public.estate_guest_profiles
  ALTER COLUMN estate_ids DROP DEFAULT;

ALTER TABLE public.estate_guest_profiles
  ADD CONSTRAINT estate_guest_profiles_estate_ids_nonempty
  CHECK (cardinality(estate_ids) >= 1);

DROP POLICY IF EXISTS estate_guest_profiles_select_host ON public.estate_guest_profiles;
DROP POLICY IF EXISTS estate_guest_profiles_write_host ON public.estate_guest_profiles;
DROP POLICY IF EXISTS estate_guest_profiles_require_covered_write ON public.estate_guest_profiles;
DROP POLICY IF EXISTS estate_guest_profiles_require_covered_modify ON public.estate_guest_profiles;
DROP POLICY IF EXISTS estate_guest_profiles_require_covered_delete ON public.estate_guest_profiles;

DROP INDEX IF EXISTS public.estate_guest_profiles_estate_id_idx;

ALTER TABLE public.estate_guest_profiles
  DROP COLUMN estate_id;

CREATE INDEX estate_guest_profiles_estate_ids_gin
  ON public.estate_guest_profiles USING GIN (estate_ids);

CREATE OR REPLACE FUNCTION public.estate_actor_is_host_of_any(p_estate_ids uuid[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(p_estate_ids, '{}'::uuid[]) <> '{}'::uuid[]
    AND EXISTS (
      SELECT 1 FROM unnest(p_estate_ids) AS eid
      WHERE public.estate_actor_is_host(eid)
    );
$$;

CREATE OR REPLACE FUNCTION public.estate_actor_is_host_of_all(p_estate_ids uuid[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(p_estate_ids, '{}'::uuid[]) <> '{}'::uuid[]
    AND NOT EXISTS (
      SELECT 1 FROM unnest(p_estate_ids) AS eid
      WHERE NOT public.estate_actor_is_host(eid)
    );
$$;

CREATE OR REPLACE FUNCTION public.estate_host_write_allowed_any(p_estate_ids uuid[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(p_estate_ids, '{}'::uuid[]) <> '{}'::uuid[]
    AND EXISTS (
      SELECT 1 FROM unnest(p_estate_ids) AS eid
      WHERE public.estate_host_write_allowed(eid)
    );
$$;

CREATE OR REPLACE FUNCTION public.estate_host_write_allowed_all(p_estate_ids uuid[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(p_estate_ids, '{}'::uuid[]) <> '{}'::uuid[]
    AND NOT EXISTS (
      SELECT 1 FROM unnest(p_estate_ids) AS eid
      WHERE NOT public.estate_host_write_allowed(eid)
    );
$$;

REVOKE ALL ON FUNCTION public.estate_actor_is_host_of_any(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.estate_actor_is_host_of_all(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.estate_host_write_allowed_any(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.estate_host_write_allowed_all(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.estate_actor_is_host_of_any(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.estate_actor_is_host_of_all(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.estate_host_write_allowed_any(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.estate_host_write_allowed_all(uuid[]) TO authenticated, service_role;

CREATE POLICY estate_guest_profiles_select_host
ON public.estate_guest_profiles FOR SELECT TO authenticated
USING (public.estate_actor_is_host_of_any(estate_ids));

CREATE POLICY estate_guest_profiles_write_host
ON public.estate_guest_profiles FOR ALL TO authenticated
USING (public.estate_actor_is_host_of_any(estate_ids))
WITH CHECK (public.estate_actor_is_host_of_any(estate_ids));

CREATE POLICY estate_guest_profiles_require_covered_write
ON public.estate_guest_profiles AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.estate_host_write_allowed_all(estate_ids));

CREATE POLICY estate_guest_profiles_require_covered_modify
ON public.estate_guest_profiles AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.estate_host_write_allowed_any(estate_ids))
WITH CHECK (public.estate_host_write_allowed_any(estate_ids));

CREATE POLICY estate_guest_profiles_require_covered_delete
ON public.estate_guest_profiles AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.estate_host_write_allowed_any(estate_ids));

CREATE OR REPLACE FUNCTION public.estate_guest_profiles_estate_ids_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  added uuid;
  removed uuid;
BEGIN
  NEW.estate_ids := ARRAY(
    SELECT DISTINCT x FROM unnest(COALESCE(NEW.estate_ids, '{}'::uuid[])) AS x
  );

  IF cardinality(NEW.estate_ids) < 1 THEN
    RAISE EXCEPTION 'Keep at least one property';
  END IF;

  IF current_setting('maison.skip_guest_profile_estate_ids_guard', true) = '1' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(NEW.estate_ids) AS eid
    WHERE NOT EXISTS (SELECT 1 FROM public.estates e WHERE e.id = eid)
  ) THEN
    RAISE EXCEPTION 'Unknown property';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT public.estate_actor_is_host_of_all(NEW.estate_ids) THEN
      RAISE EXCEPTION 'Not a host of every selected property';
    END IF;
    RETURN NEW;
  END IF;

  FOR added IN
    SELECT unnest(NEW.estate_ids)
    EXCEPT
    SELECT unnest(OLD.estate_ids)
  LOOP
    IF NOT public.estate_actor_is_host(added) THEN
      RAISE EXCEPTION 'Not a host of that property';
    END IF;
    IF NOT public.estate_host_write_allowed(added) THEN
      RAISE EXCEPTION 'Property is not covered';
    END IF;
  END LOOP;

  FOR removed IN
    SELECT unnest(OLD.estate_ids)
    EXCEPT
    SELECT unnest(NEW.estate_ids)
  LOOP
    IF NOT public.estate_actor_is_host(removed) THEN
      RAISE EXCEPTION 'Not a host of that property';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.stays s
      WHERE s.guest_profile_id = NEW.id AND s.estate_id = removed
    ) THEN
      RAISE EXCEPTION 'Cancel stays on that property first';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS estate_guest_profiles_estate_ids_guard_trg ON public.estate_guest_profiles;
CREATE TRIGGER estate_guest_profiles_estate_ids_guard_trg
  BEFORE INSERT OR UPDATE OF estate_ids ON public.estate_guest_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.estate_guest_profiles_estate_ids_guard();

CREATE OR REPLACE FUNCTION public.estate_guest_profiles_on_estate_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('maison.skip_guest_profile_estate_ids_guard', '1', true);

  DELETE FROM public.estate_guest_profiles
  WHERE OLD.id = ANY(estate_ids) AND cardinality(estate_ids) = 1;

  UPDATE public.estate_guest_profiles
  SET estate_ids = array_remove(estate_ids, OLD.id)
  WHERE OLD.id = ANY(estate_ids);

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS estate_guest_profiles_on_estate_delete_trg ON public.estates;
CREATE TRIGGER estate_guest_profiles_on_estate_delete_trg
  BEFORE DELETE ON public.estates
  FOR EACH ROW
  EXECUTE FUNCTION public.estate_guest_profiles_on_estate_delete();
