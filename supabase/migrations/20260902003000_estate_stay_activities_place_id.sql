-- Exact Google Place for a stay activity (street number + business).

ALTER TABLE public.estate_stay_activities
  ADD COLUMN IF NOT EXISTS place_id text;
