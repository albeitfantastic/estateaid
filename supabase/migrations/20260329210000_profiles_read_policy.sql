-- Allow any authenticated user to read any profile row.
-- This is needed so owners can display guest names (and vice-versa)
-- in inbox, stays, tickets, etc.

-- Drop existing select policy if one exists (safe to re-run)
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;

CREATE POLICY "profiles_select_authenticated"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);
