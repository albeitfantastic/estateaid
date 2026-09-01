-- Named guests who do not have the app. Hosts book stays against these rows
-- so occupancy stays visible without an auth user.

CREATE TABLE public.estate_guest_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id uuid NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  calendar_color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT estate_guest_profiles_name_len CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  CONSTRAINT estate_guest_profiles_color_hex CHECK (
    calendar_color IS NULL OR calendar_color ~ '^#[0-9A-Fa-f]{6}$'
  )
);

CREATE INDEX estate_guest_profiles_estate_id_idx
  ON public.estate_guest_profiles (estate_id);

ALTER TABLE public.stays
  ALTER COLUMN guest_id DROP NOT NULL;

ALTER TABLE public.stays
  ADD COLUMN guest_profile_id uuid REFERENCES public.estate_guest_profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.stays
  ADD CONSTRAINT stays_guest_identity_chk
  CHECK (
    (guest_id IS NOT NULL AND guest_profile_id IS NULL)
    OR (guest_id IS NULL AND guest_profile_id IS NOT NULL)
  );

CREATE INDEX stays_guest_profile_id_idx
  ON public.stays (guest_profile_id)
  WHERE guest_profile_id IS NOT NULL;

ALTER TABLE public.estate_guest_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY estate_guest_profiles_select_host
ON public.estate_guest_profiles FOR SELECT TO authenticated
USING (public.estate_actor_is_host(estate_id));

CREATE POLICY estate_guest_profiles_write_host
ON public.estate_guest_profiles FOR ALL TO authenticated
USING (public.estate_actor_is_host(estate_id))
WITH CHECK (public.estate_actor_is_host(estate_id));

CREATE POLICY estate_guest_profiles_require_covered_write
ON public.estate_guest_profiles AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.estate_host_write_allowed(estate_id));

CREATE POLICY estate_guest_profiles_require_covered_modify
ON public.estate_guest_profiles AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.estate_host_write_allowed(estate_id))
WITH CHECK (public.estate_host_write_allowed(estate_id));

CREATE POLICY estate_guest_profiles_require_covered_delete
ON public.estate_guest_profiles AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.estate_host_write_allowed(estate_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estate_guest_profiles TO authenticated;
