-- estate_events: owners manage rows for their estates; accepted guests can read (calendar).

ALTER TABLE public.estate_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estate_events_select_visible" ON public.estate_events;
CREATE POLICY "estate_events_select_visible"
ON public.estate_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.estates e
    WHERE e.id = estate_events.estate_id
      AND e.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.invitations i
    WHERE i.estate_id = estate_events.estate_id
      AND i.guest_id = auth.uid()
      AND i.status = 'accepted'
  )
);

DROP POLICY IF EXISTS "estate_events_insert_owner" ON public.estate_events;
CREATE POLICY "estate_events_insert_owner"
ON public.estate_events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.estates e
    WHERE e.id = estate_events.estate_id
      AND e.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "estate_events_update_owner" ON public.estate_events;
CREATE POLICY "estate_events_update_owner"
ON public.estate_events
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.estates e
    WHERE e.id = estate_events.estate_id
      AND e.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.estates e
    WHERE e.id = estate_events.estate_id
      AND e.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "estate_events_delete_owner" ON public.estate_events;
CREATE POLICY "estate_events_delete_owner"
ON public.estate_events
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.estates e
    WHERE e.id = estate_events.estate_id
      AND e.owner_id = auth.uid()
  )
);
