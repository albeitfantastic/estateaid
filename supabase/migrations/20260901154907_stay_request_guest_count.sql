-- Total people visiting on a stay request (including the requester).

ALTER TABLE public.stay_requests
  ADD COLUMN IF NOT EXISTS guest_count integer NOT NULL DEFAULT 1;

ALTER TABLE public.stay_requests
  DROP CONSTRAINT IF EXISTS stay_requests_guest_count_range;

ALTER TABLE public.stay_requests
  ADD CONSTRAINT stay_requests_guest_count_range
  CHECK (guest_count >= 1 AND guest_count <= 20);
