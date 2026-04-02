import { supabase } from '@/lib/supabase';

export type StartTrialResult = { ok: true } | { ok: false; reason: string };

/** Starts the one-time 14-day app trial (server: start_app_trial RPC). */
export async function startAppTrialRpc(): Promise<StartTrialResult> {
  const { data, error } = await supabase.rpc('start_app_trial');
  if (error) {
    return { ok: false, reason: error.message };
  }
  const row = data as { ok?: boolean; reason?: string } | null;
  if (row?.ok === true) {
    return { ok: true };
  }
  return { ok: false, reason: (row?.reason as string) ?? 'unknown' };
}
