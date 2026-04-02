-- Remote DBs may still have profiles.role NOT NULL while the app no longer sends role
-- (migration 20260429120000 may not have reached this step if it failed earlier).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'profiles'
      AND c.column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN role DROP NOT NULL;
    ALTER TABLE public.profiles DROP COLUMN role;
  END IF;
END $$;
