-- Guest issue insert/update only while the guest has a stay today (inclusive from–to).

CREATE INDEX IF NOT EXISTS stays_estate_guest_id_idx
  ON public.stays (estate_id, guest_id);

DROP POLICY IF EXISTS "estate_events_insert_guest_issue" ON public.estate_events;
CREATE POLICY "estate_events_insert_guest_issue"
ON public.estate_events
FOR INSERT
TO authenticated
WITH CHECK (
  type = 'task'
  AND task_kind = 'issue'
  AND guest_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.invitations i
    WHERE i.estate_id = estate_events.estate_id
      AND i.guest_id = (SELECT auth.uid())
      AND i.status = 'accepted'
  )
  AND EXISTS (
    SELECT 1
    FROM public.stays s
    WHERE s.estate_id = estate_events.estate_id
      AND s.guest_id = (SELECT auth.uid())
      AND s."from" <= CURRENT_DATE
      AND s."to" >= CURRENT_DATE
  )
);

DROP POLICY IF EXISTS "estate_events_update_guest_issue" ON public.estate_events;
CREATE POLICY "estate_events_update_guest_issue"
ON public.estate_events
FOR UPDATE
TO authenticated
USING (
  type = 'task'
  AND task_kind = 'issue'
  AND guest_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.invitations i
    WHERE i.estate_id = estate_events.estate_id
      AND i.guest_id = (SELECT auth.uid())
      AND i.status = 'accepted'
  )
  AND EXISTS (
    SELECT 1
    FROM public.stays s
    WHERE s.estate_id = estate_events.estate_id
      AND s.guest_id = (SELECT auth.uid())
      AND s."from" <= CURRENT_DATE
      AND s."to" >= CURRENT_DATE
  )
)
WITH CHECK (
  type = 'task'
  AND task_kind = 'issue'
  AND guest_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.invitations i
    WHERE i.estate_id = estate_events.estate_id
      AND i.guest_id = (SELECT auth.uid())
      AND i.status = 'accepted'
  )
  AND EXISTS (
    SELECT 1
    FROM public.stays s
    WHERE s.estate_id = estate_events.estate_id
      AND s.guest_id = (SELECT auth.uid())
      AND s."from" <= CURRENT_DATE
      AND s."to" >= CURRENT_DATE
  )
);
