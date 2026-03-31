-- Mirrored subscription state from RevenueCat webhooks only (no client writes).
-- No payment payloads, tokens, or card data — metadata only.

CREATE TABLE IF NOT EXISTS public.subscription_entitlements (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  entitlement_id text NOT NULL,
  product_id text,
  status text NOT NULL CHECK (
    status IN ('active', 'expired', 'cancelled', 'grace_period', 'billing_issue', 'unknown')
  ),
  expires_at timestamptz,
  store text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_event_id text,
  PRIMARY KEY (user_id, entitlement_id)
);

CREATE INDEX IF NOT EXISTS subscription_entitlements_user_id_idx
  ON public.subscription_entitlements (user_id);

ALTER TABLE public.subscription_entitlements ENABLE ROW LEVEL SECURITY;

-- Authenticated users may read only their own rows (UX). No insert/update/delete.
DROP POLICY IF EXISTS "subscription_entitlements_select_own" ON public.subscription_entitlements;
CREATE POLICY "subscription_entitlements_select_own"
ON public.subscription_entitlements
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

COMMENT ON TABLE public.subscription_entitlements IS
  'RevenueCat entitlement mirror; updated by Edge Function webhook with service role only.';

-- Server-side / RPC: checks mirrored state using auth.uid() — do not pass arbitrary user ids from clients.
CREATE OR REPLACE FUNCTION public.user_has_active_entitlement(p_entitlement_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscription_entitlements se
    WHERE se.user_id = auth.uid()
      AND se.entitlement_id = p_entitlement_id
      AND se.status IN ('active', 'cancelled', 'grace_period')
      AND (se.expires_at IS NULL OR se.expires_at > now())
  );
$$;

REVOKE ALL ON FUNCTION public.user_has_active_entitlement(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_active_entitlement(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_active_entitlement(text) TO service_role;

COMMENT ON FUNCTION public.user_has_active_entitlement(text) IS
  'Returns true if the current user has access for entitlement_id based on trusted DB mirror. Uses auth.uid() internally.';
