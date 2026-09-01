-- Sponsor-assigned color so hosts can tell guests apart on calendars.

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS calendar_color text;

ALTER TABLE public.invitations
  DROP CONSTRAINT IF EXISTS invitations_calendar_color_hex;

ALTER TABLE public.invitations
  ADD CONSTRAINT invitations_calendar_color_hex
  CHECK (calendar_color IS NULL OR calendar_color ~ '^#[0-9A-Fa-f]{6}$');
