-- Guests need to read estate rows for properties they redeemed / accepted an invite on.
-- Without this, invitations.status = 'accepted' but estates SELECT returns no row → empty Properties tab.

CREATE POLICY "estates_select_accepted_guest"
ON public.estates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.invitations i
    WHERE i.estate_id = estates.id
      AND i.guest_id = auth.uid()
      AND i.status = 'accepted'
  )
);
