-- Calendar (and conflict checks) need all stays on an estate, not only the current user's rows.
-- Without this, guests with an accepted invite see empty estateStays → no "booked by others" on the grid.

CREATE POLICY "stays_select_accepted_guest"
ON public.stays
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.invitations i
    WHERE i.estate_id = stays.estate_id
      AND i.guest_id = auth.uid()
      AND i.status = 'accepted'
  )
);
