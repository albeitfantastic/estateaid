-- Things guests can do during a stay (nearby restaurants, walks, beaches).
-- Distinct from estate_activity_log, which records who did what on the property.

CREATE TABLE IF NOT EXISTS public.estate_stay_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id uuid NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  address text,
  contact_id uuid REFERENCES public.estate_contacts(id) ON DELETE SET NULL,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS estate_stay_activities_estate_id_idx
  ON public.estate_stay_activities (estate_id);

ALTER TABLE public.estate_stay_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estate_stay_activities_select" ON public.estate_stay_activities;
CREATE POLICY "estate_stay_activities_select"
  ON public.estate_stay_activities FOR SELECT TO authenticated
  USING (
    public.estate_actor_role(estate_id, auth.uid()) IN ('sponsor', 'owner', 'guest')
  );

DROP POLICY IF EXISTS "estate_stay_activities_insert" ON public.estate_stay_activities;
CREATE POLICY "estate_stay_activities_insert"
  ON public.estate_stay_activities FOR INSERT TO authenticated
  WITH CHECK (public.estate_host_write_allowed(estate_id));

DROP POLICY IF EXISTS "estate_stay_activities_update" ON public.estate_stay_activities;
CREATE POLICY "estate_stay_activities_update"
  ON public.estate_stay_activities FOR UPDATE TO authenticated
  USING (public.estate_host_write_allowed(estate_id))
  WITH CHECK (public.estate_host_write_allowed(estate_id));

DROP POLICY IF EXISTS "estate_stay_activities_delete" ON public.estate_stay_activities;
CREATE POLICY "estate_stay_activities_delete"
  ON public.estate_stay_activities FOR DELETE TO authenticated
  USING (public.estate_host_write_allowed(estate_id));
