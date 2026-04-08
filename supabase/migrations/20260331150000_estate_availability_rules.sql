-- Owner-configured availability rules (blackouts, seasonal closure, min stay, max advance).
-- Calendar blocking still combines stays, events, and finalizeCalendarAvailability on the client.

CREATE TABLE IF NOT EXISTS public.estate_availability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id uuid NOT NULL REFERENCES public.estates (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (
    kind IN ('blackout', 'annual_closure', 'min_nights', 'max_advance_days')
  ),
  title text,
  date_from date,
  date_to date,
  annual_from text,
  annual_to text,
  min_nights integer,
  max_advance_days integer,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS estate_availability_rules_estate_id_idx
  ON public.estate_availability_rules (estate_id);

ALTER TABLE public.estate_availability_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estate_availability_rules_select_visible" ON public.estate_availability_rules;
CREATE POLICY "estate_availability_rules_select_visible"
ON public.estate_availability_rules
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.estates e
    WHERE e.id = estate_availability_rules.estate_id
      AND e.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.invitations i
    WHERE i.estate_id = estate_availability_rules.estate_id
      AND i.guest_id = auth.uid()
      AND i.status = 'accepted'
  )
);

DROP POLICY IF EXISTS "estate_availability_rules_insert_owner" ON public.estate_availability_rules;
CREATE POLICY "estate_availability_rules_insert_owner"
ON public.estate_availability_rules
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.estates e
    WHERE e.id = estate_availability_rules.estate_id
      AND e.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "estate_availability_rules_update_owner" ON public.estate_availability_rules;
CREATE POLICY "estate_availability_rules_update_owner"
ON public.estate_availability_rules
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.estates e
    WHERE e.id = estate_availability_rules.estate_id
      AND e.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.estates e
    WHERE e.id = estate_availability_rules.estate_id
      AND e.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "estate_availability_rules_delete_owner" ON public.estate_availability_rules;
CREATE POLICY "estate_availability_rules_delete_owner"
ON public.estate_availability_rules
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.estates e
    WHERE e.id = estate_availability_rules.estate_id
      AND e.owner_id = auth.uid()
  )
);
