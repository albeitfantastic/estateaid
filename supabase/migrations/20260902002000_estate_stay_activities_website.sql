-- Optional website for a stay activity (restaurant, beach, hike, etc.).

ALTER TABLE public.estate_stay_activities
  ADD COLUMN IF NOT EXISTS website text;
