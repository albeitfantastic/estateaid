-- Remove legacy "closed" status: map to resolved and tighten CHECK constraint.
UPDATE public.tickets SET status = 'resolved' WHERE status = 'closed';

ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE public.tickets ADD CONSTRAINT tickets_status_check CHECK (
  status IN ('open', 'in_progress', 'resolved')
);
