import type { SubscriptionEntitlementRow } from '@/types/subscription';
import { supabase } from '@/lib/supabase';

/**
 * Whether a mirrored row still grants access (UX / client hint only).
 * Authoritative enforcement: `user_has_active_entitlement` RPC or service-role queries server-side.
 */
export function rowGrantsAccess(row: Pick<SubscriptionEntitlementRow, 'status' | 'expires_at'>): boolean {
  if (row.status === 'expired') return false;
  if (row.expires_at != null && row.expires_at.length > 0) {
    if (new Date(row.expires_at).getTime() <= Date.now()) return false;
  }
  return ['active', 'cancelled', 'grace_period', 'billing_issue', 'unknown'].includes(row.status);
}

/** Fetch current user's entitlement rows (RLS: own rows only). */
export async function fetchSubscriptionEntitlements(): Promise<{
  data: SubscriptionEntitlementRow[] | null;
  error: string | null;
}> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getUser();
  if (sessionError || !sessionData.user) {
    return { data: null, error: sessionError?.message ?? 'not_authenticated' };
  }
  const uid = sessionData.user.id;
  const { data, error } = await supabase
    .from('subscription_entitlements')
    .select('user_id, entitlement_id, product_id, status, expires_at, store, updated_at, last_event_id')
    .eq('user_id', uid);
  if (error) return { data: null, error: error.message };
  return { data: data as SubscriptionEntitlementRow[], error: null };
}

/**
 * Server-aligned check using SECURITY DEFINER RPC (uses auth.uid() — never pass a user id from UI).
 */
export async function rpcUserHasEntitlement(entitlementId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('user_has_active_entitlement', {
    p_entitlement_id: entitlementId,
  });
  if (error) return false;
  return data === true;
}
