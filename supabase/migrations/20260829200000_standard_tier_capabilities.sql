-- Standard tier: allow first estate; Pro/trial for additional.
-- Keep Maison Pro / maison_pro aliases from prior migration.

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
      (SELECT count(*)::int FROM public.estates e WHERE e.owner_id = auth.uid()) = 0
    );
$$;

REVOKE ALL ON FUNCTION public.user_can_create_estate() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_create_estate() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_create_estate() TO service_role;

DROP POLICY IF EXISTS "estates_insert_host" ON public.estates;
CREATE POLICY "estates_insert_host"
  ON public.estates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND public.user_can_create_estate()
  );

-- Standard owners may update their own estate rows (basic details).
DROP POLICY IF EXISTS "estates_update_host" ON public.estates;
CREATE POLICY "estates_update_host"
  ON public.estates
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Delete still requires full product access (avoid wiping extras without Pro intent).
DROP POLICY IF EXISTS "estates_delete_host" ON public.estates;
CREATE POLICY "estates_delete_host"
  ON public.estates
  FOR DELETE
  TO authenticated
  USING (
    owner_id = auth.uid()
    AND public.user_has_full_product_access()
  );

-- RPC for clean client errors when creating estates
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

  INSERT INTO public.estates (id, owner_id, name, location, description, cover_image_url, time_zone)
  VALUES (
    p_id,
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

REVOKE ALL ON FUNCTION public.create_estate(uuid, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_estate(uuid, text, text, text, text, text) TO authenticated;

-- Profile fields for rating once + onboarding use case
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rating_prompt_shown_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_use_case text;
