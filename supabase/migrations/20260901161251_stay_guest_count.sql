-- Party size on confirmed stays (host Add Stay and approved requests).

ALTER TABLE public.stays
  ADD COLUMN IF NOT EXISTS guest_count integer NOT NULL DEFAULT 1;

ALTER TABLE public.stays
  DROP CONSTRAINT IF EXISTS stays_guest_count_range;

ALTER TABLE public.stays
  ADD CONSTRAINT stays_guest_count_range
  CHECK (guest_count >= 1 AND guest_count <= 20);

-- Copy party size from approved stay requests where possible.
UPDATE public.stays s
SET guest_count = sr.guest_count
FROM public.stay_requests sr
WHERE s.stay_request_id = sr.id
  AND sr.guest_count IS NOT NULL
  AND s.guest_count = 1
  AND sr.guest_count <> 1;
