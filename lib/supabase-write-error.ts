import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Distinguishes "the server said no" from "the server was unreachable".
 *
 * PostgREST always returns a SQLSTATE-ish `code` for rejected writes (`42501` for
 * an RLS denial, `23503` for a broken reference). A transport failure surfaces as
 * an error with no code at all, which means the write may still be valid — the
 * caller should keep the optimistic row and retry rather than discard the user's
 * input.
 */
export function isTransportError(error: PostgrestError | null | undefined): boolean {
  if (!error) return false;
  return !error.code;
}

/** Fail a bootstrap fetch so `loadAllStores` can surface a retry without wiping cache. */
export function throwIfQueryError(error: { message: string } | null | undefined): void {
  if (error) throw new Error(error.message);
}
