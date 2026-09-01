-- Per-property expenses (§14.3). Record-keeping only — not financial advice.
-- Version matches remote schema_migrations (applied as estate_expenses).

CREATE TABLE IF NOT EXISTS public.estate_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id uuid NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expense_date date NOT NULL DEFAULT (CURRENT_DATE),
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'EUR',
  category text NOT NULL DEFAULT 'other',
  note text,
  stay_id uuid,
  event_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS estate_expenses_estate_id_idx ON public.estate_expenses (estate_id);

ALTER TABLE public.estate_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estate_expenses_select" ON public.estate_expenses;
CREATE POLICY "estate_expenses_select"
  ON public.estate_expenses FOR SELECT TO authenticated
  USING (
    public.estate_actor_role(estate_id, auth.uid()) IN ('sponsor', 'owner', 'guest')
  );

DROP POLICY IF EXISTS "estate_expenses_write" ON public.estate_expenses;
CREATE POLICY "estate_expenses_insert"
  ON public.estate_expenses FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.estate_host_write_allowed(estate_id)
  );

CREATE POLICY "estate_expenses_update"
  ON public.estate_expenses FOR UPDATE TO authenticated
  USING (public.estate_host_write_allowed(estate_id))
  WITH CHECK (public.estate_host_write_allowed(estate_id));

CREATE POLICY "estate_expenses_delete"
  ON public.estate_expenses FOR DELETE TO authenticated
  USING (public.estate_host_write_allowed(estate_id));
