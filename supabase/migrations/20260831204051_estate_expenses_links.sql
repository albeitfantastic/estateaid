-- Expenses may be attributed to a stay or a maintenance event (§14.3). The columns
-- existed but carried no referential integrity, so a deleted stay left a dangling id.
-- Version matches remote schema_migrations (applied as estate_expenses_links).

ALTER TABLE public.estate_expenses
  DROP CONSTRAINT IF EXISTS estate_expenses_stay_id_fkey;
ALTER TABLE public.estate_expenses
  ADD CONSTRAINT estate_expenses_stay_id_fkey
  FOREIGN KEY (stay_id) REFERENCES public.stays(id) ON DELETE SET NULL;

ALTER TABLE public.estate_expenses
  DROP CONSTRAINT IF EXISTS estate_expenses_event_id_fkey;
ALTER TABLE public.estate_expenses
  ADD CONSTRAINT estate_expenses_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.estate_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS estate_expenses_stay_id_idx
  ON public.estate_expenses (stay_id) WHERE stay_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS estate_expenses_event_id_idx
  ON public.estate_expenses (event_id) WHERE event_id IS NOT NULL;
