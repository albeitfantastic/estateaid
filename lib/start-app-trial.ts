import { supabase } from '@/lib/supabase';

export type StartTrialResult = { ok: true } | { ok: false; reason: string };

/** True when PostgREST reports the RPC is missing (migration / SQL not applied on the linked project). */
export function isTrialRpcMissingError(message: string): boolean {
  return /start_app_trial|schema cache/i.test(message);
}

/** Starts the one-time 14-day app trial (server: start_app_trial RPC). */
export async function startAppTrialRpc(): Promise<StartTrialResult> {
  // Explicit empty args helps PostgREST resolve a zero-parameter function in some setups.
  const { data, error } = await supabase.rpc('start_app_trial', {});

  if (error) {
    return { ok: false, reason: error.message };
  }
  const row = data as { ok?: boolean; reason?: string } | null;
  if (row?.ok === true) {
    return { ok: true };
  }
  return { ok: false, reason: (row?.reason as string) ?? 'unknown' };
}
