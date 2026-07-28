-- Tickets linked to properties (estates): table, FK, and RLS so owners and accepted guests can sync.
-- App expects: id, estate_id, guest_id, title, status, priority, due_date, assignee_id, messages (jsonb), created_at, updated_at.

CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY,
  estate_id uuid NOT NULL REFERENCES public.estates (id) ON DELETE CASCADE,
  guest_id uuid NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  due_date date,
  assignee_id uuid,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tickets_status_check CHECK (
    status IN ('open', 'in_progress', 'resolved')
  ),
  CONSTRAINT tickets_priority_check CHECK (
    priority IN ('low', 'normal', 'high', 'urgent')
  )
);

CREATE INDEX IF NOT EXISTS tickets_estate_id_idx ON public.tickets (estate_id);
CREATE INDEX IF NOT EXISTS tickets_guest_id_idx ON public.tickets (guest_id);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;

DROP POLICY IF EXISTS "tickets_select_visible" ON public.tickets;
CREATE POLICY "tickets_select_visible"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.estates e
    WHERE e.id = tickets.estate_id
      AND e.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.invitations i
    WHERE i.estate_id = tickets.estate_id
      AND i.guest_id = auth.uid()
      AND i.status = 'accepted'
  )
);

-- Host creates tickets on their estates (guest_id may be the host when they report for themselves).
DROP POLICY IF EXISTS "tickets_insert_owner" ON public.tickets;
CREATE POLICY "tickets_insert_owner"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.estates e
    WHERE e.id = tickets.estate_id
      AND e.owner_id = auth.uid()
  )
);

-- Guest files a ticket only on estates they are accepted on; must be the reporter.
DROP POLICY IF EXISTS "tickets_insert_guest" ON public.tickets;
CREATE POLICY "tickets_insert_guest"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (
  guest_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.invitations i
    WHERE i.estate_id = tickets.estate_id
      AND i.guest_id = auth.uid()
      AND i.status = 'accepted'
  )
);

DROP POLICY IF EXISTS "tickets_update_owner" ON public.tickets;
CREATE POLICY "tickets_update_owner"
ON public.tickets
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.estates e
    WHERE e.id = tickets.estate_id
      AND e.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.estates e
    WHERE e.id = tickets.estate_id
      AND e.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "tickets_update_reporter" ON public.tickets;
CREATE POLICY "tickets_update_reporter"
ON public.tickets
FOR UPDATE
TO authenticated
USING (
  guest_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.invitations i
    WHERE i.estate_id = tickets.estate_id
      AND i.guest_id = auth.uid()
      AND i.status = 'accepted'
  )
)
WITH CHECK (
  guest_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.invitations i
    WHERE i.estate_id = tickets.estate_id
      AND i.guest_id = auth.uid()
      AND i.status = 'accepted'
  )
);

DROP POLICY IF EXISTS "tickets_delete_owner" ON public.tickets;
CREATE POLICY "tickets_delete_owner"
ON public.tickets
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.estates e
    WHERE e.id = tickets.estate_id
      AND e.owner_id = auth.uid()
  )
);
