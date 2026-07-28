-- Merge tickets into estate_events as type='task', task_kind='issue'.
-- Adds columns, backfills from tickets, guest RLS for issues, drops tickets.

-- 1) New columns on estate_events
ALTER TABLE public.estate_events
  ADD COLUMN IF NOT EXISTS task_kind text,
  ADD COLUMN IF NOT EXISTS guest_id uuid,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS assignee_id uuid,
  ADD COLUMN IF NOT EXISTS messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.estate_events
SET messages = '[]'::jsonb
WHERE messages IS NULL;

UPDATE public.estate_events
SET task_kind = 'calendar'
WHERE type = 'task' AND task_kind IS NULL;

UPDATE public.estate_events
SET updated_at = COALESCE(updated_at, created_at)
WHERE updated_at IS NULL;

-- 2) Backfill issues from tickets (preserve ticket UUID as event id)
INSERT INTO public.estate_events (
  id,
  estate_id,
  title,
  description,
  type,
  date,
  recurrence,
  color,
  created_at,
  task_kind,
  guest_id,
  status,
  priority,
  assignee_id,
  messages,
  updated_at
)
SELECT
  t.id,
  t.estate_id,
  t.title,
  NULL::text,
  'task'::text,
  t.due_date,
  NULL::jsonb,
  '#0a7ea4'::text,
  t.created_at,
  'issue'::text,
  t.guest_id,
  t.status,
  t.priority,
  t.assignee_id,
  COALESCE(t.messages, '[]'::jsonb),
  t.updated_at
FROM public.tickets t
WHERE NOT EXISTS (SELECT 1 FROM public.estate_events e WHERE e.id = t.id);

UPDATE public.estate_events SET task_kind = NULL WHERE type = 'recurring';
UPDATE public.estate_events SET messages = '[]'::jsonb WHERE type = 'recurring';
UPDATE public.estate_events
SET guest_id = NULL, status = NULL, priority = NULL, assignee_id = NULL
WHERE type <> 'task' OR task_kind IS DISTINCT FROM 'issue';

-- 3) Table constraint: recurring rows have no task_kind; tasks have calendar|issue; issues need core fields
ALTER TABLE public.estate_events DROP CONSTRAINT IF EXISTS estate_events_task_shape_check;
ALTER TABLE public.estate_events ADD CONSTRAINT estate_events_task_shape_check CHECK (
  (type = 'recurring' AND task_kind IS NULL)
  OR (
    type = 'task'
    AND task_kind IN ('calendar', 'issue')
    AND (
      task_kind <> 'issue'
      OR (
        guest_id IS NOT NULL
        AND status IS NOT NULL
        AND priority IS NOT NULL
        AND status IN ('open', 'in_progress', 'resolved')
        AND priority IN ('low', 'normal', 'high', 'urgent')
      )
    )
  )
);

-- 4) Guest policies for issue tasks (mirror former tickets_* policies)
DROP POLICY IF EXISTS "estate_events_insert_guest_issue" ON public.estate_events;
CREATE POLICY "estate_events_insert_guest_issue"
ON public.estate_events
FOR INSERT
TO authenticated
WITH CHECK (
  type = 'task'
  AND task_kind = 'issue'
  AND guest_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.invitations i
    WHERE i.estate_id = estate_events.estate_id
      AND i.guest_id = auth.uid()
      AND i.status = 'accepted'
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
  AND guest_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.invitations i
    WHERE i.estate_id = estate_events.estate_id
      AND i.guest_id = auth.uid()
      AND i.status = 'accepted'
  )
)
WITH CHECK (
  type = 'task'
  AND task_kind = 'issue'
  AND guest_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.invitations i
    WHERE i.estate_id = estate_events.estate_id
      AND i.guest_id = auth.uid()
      AND i.status = 'accepted'
  )
);

-- 5) Owner insert must set task_kind for new tasks (WITH CHECK on insert_owner)
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
  AND (
    type = 'recurring'
    OR (
      type = 'task'
      AND task_kind IS NOT NULL
      AND task_kind IN ('calendar', 'issue')
    )
  )
);

-- 6) Drop legacy tickets table (policies/indexes go with it)
DROP TABLE IF EXISTS public.tickets CASCADE;
