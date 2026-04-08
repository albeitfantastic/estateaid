-- Optional due date for tickets (ISO calendar date); used in owner calendar.
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS due_date date;
