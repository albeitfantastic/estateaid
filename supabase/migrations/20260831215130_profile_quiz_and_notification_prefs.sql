-- Persist onboarding Q1–Q3, recipient notification prefs, conversion + re-ask flags.
-- Per-event reminder lead time for maintenance pushes (spec §14.1).
-- Version matches remote schema_migrations (applied as profile_quiz_and_notification_prefs).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_quiz jsonb,
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{"stay_requests":true,"stay_decisions":true,"stay_reminders":true,"maintenance":true,"invites":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS conversion_invite_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS property_type_reasked boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.onboarding_quiz IS
  'Onboarding Q1–Q4 answers: {q1:int, q2:int, q3:int, use_case:text}.';
COMMENT ON COLUMN public.profiles.notification_prefs IS
  'Per-category push opt-out. Checked for the recipient at send time, not the sender.';
COMMENT ON COLUMN public.profiles.conversion_invite_seen_at IS
  'When the invite-accepted conversion card was dismissed (once per user).';
COMMENT ON COLUMN public.profiles.property_type_reasked IS
  'Invite-first users re-asked property type on first create (spec §11.3).';

ALTER TABLE public.estate_events
  ADD COLUMN IF NOT EXISTS reminder_lead_days integer;

COMMENT ON COLUMN public.estate_events.reminder_lead_days IS
  'Days before the next occurrence to fire a maintenance reminder push.';
