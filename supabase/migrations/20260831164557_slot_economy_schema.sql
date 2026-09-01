-- Slot economy schema slice.
-- Version matches remote schema_migrations (applied as slot_economy_schema).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_used_trial boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS grandfathered_slots integer;

UPDATE public.profiles
SET has_used_trial = true
WHERE trial_ends_at IS NOT NULL
  AND coalesce(has_used_trial, false) = false;

UPDATE public.profiles p
SET grandfathered_slots = greatest(
  coalesce(grandfathered_slots, 0),
  (
    SELECT count(*)::int
    FROM public.estates e
    WHERE e.sponsor_user_id = p.id
  ),
  1
)
WHERE EXISTS (
  SELECT 1
  FROM public.subscription_entitlements se
  WHERE se.user_id = p.id
    AND se.entitlement_id IN ('Maison Pro', 'maison_pro')
    AND se.status IN ('active', 'cancelled', 'grace_period', 'billing_issue')
    AND (se.expires_at IS NULL OR se.expires_at > now())
);

ALTER TABLE public.estates
  ADD COLUMN IF NOT EXISTS slot_held boolean NOT NULL DEFAULT true;

UPDATE public.estates SET sponsor_user_id = owner_id WHERE sponsor_user_id IS NULL;

UPDATE public.invitations SET role = 'owner' WHERE role IN ('coOwner', 'owner');
UPDATE public.invitations SET role = 'guest' WHERE role IS NULL OR role NOT IN ('guest', 'owner');

ALTER TABLE public.invitations ALTER COLUMN role SET DEFAULT 'guest';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invitations_role_check') THEN
    ALTER TABLE public.invitations DROP CONSTRAINT invitations_role_check;
  END IF;
  ALTER TABLE public.invitations
    ADD CONSTRAINT invitations_role_check CHECK (role IN ('guest', 'owner'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
