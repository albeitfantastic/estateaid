-- Optional display label for who a pending invite was sent to (name, email, etc.).
-- Version matches remote schema_migrations (applied as invitation_invitee_label).
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS invitee_label text;
