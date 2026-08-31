-- Optional display label for who a pending invite was sent to (name, email, etc.).
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS invitee_label text;
