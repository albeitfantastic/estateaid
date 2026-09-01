import { supabase } from '@/lib/supabase';

export type StartTrialResult =
  | { ok: true; trialEndsAt?: string }
  | { ok: false; reason: string; code?: string };

/** True when PostgREST reports the RPC is missing (migration / SQL not applied on the linked project). */
export function isTrialRpcMissingError(message: string): boolean {
  return /start_app_trial|schema cache/i.test(message);
}

/**
 * Leftover app-managed trial RPC. Production uses a store intro on the selected SKU.
 * Call only from Trust in `__DEV__` when RevenueCat is not configured (Expo web).
 */
export async function startAppTrialRpc(): Promise<StartTrialResult> {
  const { data, error } = await supabase.rpc('start_app_trial', {});

  if (error) {
    return { ok: false, reason: error.message };
  }
  const row = data as {
    ok?: boolean;
    reason?: string;
    code?: string;
    trial_ends_at?: string;
  } | null;
  if (row?.ok === true) {
    return { ok: true, trialEndsAt: row.trial_ends_at };
  }
  return {
    ok: false,
    reason: row?.code ?? row?.reason ?? 'unknown',
    code: row?.code,
  };
}
