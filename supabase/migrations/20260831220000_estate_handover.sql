-- Handover checklists (§14.3): one template per property, one completion per stay.
-- Coverage resolves through the property's sponsor via estate_is_covered().

CREATE TABLE IF NOT EXISTS public.estate_handover_templates (
  estate_id uuid PRIMARY KEY REFERENCES public.estates(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.estate_handover_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id uuid NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  stay_id uuid NOT NULL REFERENCES public.stays(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checked jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stay_id)
);

CREATE INDEX IF NOT EXISTS estate_handover_completions_estate_id_idx
  ON public.estate_handover_completions (estate_id);

-- A guest may only write their own completion, and only while the property is covered.
CREATE OR REPLACE FUNCTION public.estate_handover_completion_write_allowed(
  p_estate_id uuid,
  p_guest_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.estate_host_write_allowed(p_estate_id)
    OR (
      p_guest_id = auth.uid()
      AND public.estate_actor_role(p_estate_id, auth.uid()) = 'guest'
      AND coalesce(public.estate_is_covered(p_estate_id), false)
    );
$$;

ALTER TABLE public.estate_handover_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_handover_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estate_handover_templates_select" ON public.estate_handover_templates;
CREATE POLICY "estate_handover_templates_select"
  ON public.estate_handover_templates FOR SELECT TO authenticated
  USING (
    public.estate_actor_role(estate_id, auth.uid()) IN ('sponsor', 'owner', 'guest')
  );

DROP POLICY IF EXISTS "estate_handover_templates_insert" ON public.estate_handover_templates;
CREATE POLICY "estate_handover_templates_insert"
  ON public.estate_handover_templates FOR INSERT TO authenticated
  WITH CHECK (public.estate_host_write_allowed(estate_id));

DROP POLICY IF EXISTS "estate_handover_templates_update" ON public.estate_handover_templates;
CREATE POLICY "estate_handover_templates_update"
  ON public.estate_handover_templates FOR UPDATE TO authenticated
  USING (public.estate_host_write_allowed(estate_id))
  WITH CHECK (public.estate_host_write_allowed(estate_id));

DROP POLICY IF EXISTS "estate_handover_templates_delete" ON public.estate_handover_templates;
CREATE POLICY "estate_handover_templates_delete"
  ON public.estate_handover_templates FOR DELETE TO authenticated
  USING (public.estate_host_write_allowed(estate_id));

DROP POLICY IF EXISTS "estate_handover_completions_select" ON public.estate_handover_completions;
CREATE POLICY "estate_handover_completions_select"
  ON public.estate_handover_completions FOR SELECT TO authenticated
  USING (
    public.estate_actor_role(estate_id, auth.uid()) IN ('sponsor', 'owner', 'guest')
  );

DROP POLICY IF EXISTS "estate_handover_completions_insert" ON public.estate_handover_completions;
CREATE POLICY "estate_handover_completions_insert"
  ON public.estate_handover_completions FOR INSERT TO authenticated
  WITH CHECK (public.estate_handover_completion_write_allowed(estate_id, guest_id));

DROP POLICY IF EXISTS "estate_handover_completions_update" ON public.estate_handover_completions;
CREATE POLICY "estate_handover_completions_update"
  ON public.estate_handover_completions FOR UPDATE TO authenticated
  USING (public.estate_handover_completion_write_allowed(estate_id, guest_id))
  WITH CHECK (public.estate_handover_completion_write_allowed(estate_id, guest_id));

DROP POLICY IF EXISTS "estate_handover_completions_delete" ON public.estate_handover_completions;
CREATE POLICY "estate_handover_completions_delete"
  ON public.estate_handover_completions FOR DELETE TO authenticated
  USING (public.estate_host_write_allowed(estate_id));

COMMENT ON TABLE public.estate_handover_templates IS
  'Per-property handover checklist items. Host-writable while the property is covered.';
COMMENT ON TABLE public.estate_handover_completions IS
  'Per-stay handover tick state. Written by the staying guest or by a host.';
