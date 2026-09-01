/** Shared query helpers for intent-triggered paywall navigation. */

export function withPaywallQuery(
  base: string,
  opts: Record<string, string | undefined>
): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(opts)) {
    if (v) q.set(k, v);
  }
  const qs = q.toString();
  const sep = base.includes('?') ? '&' : '?';
  return qs ? `${base}${sep}${qs}` : base;
}

/**
 * Resolve dismiss/skip destination. Never return to screens that auto-enter the
 * paywall (would create Trust → … → Skip → Trust loops).
 */
export function resolveReturnTo(returnTo?: string | string[]): string {
  const raw = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  if (!raw || typeof raw !== 'string') return '/(app)/home';
  if (!raw.startsWith('/(app)/') && !raw.startsWith('/(onboarding)/')) return '/(app)/home';
  if (raw.includes('/settings/paywall')) return '/(app)/home';
  // Gated screens that Redirect/open paywall when standard
  if (/\/guests\/invite\/?$/.test(raw) || raw.includes('/guests/invite?')) {
    return raw.replace(/\/guests\/invite.*/, '/guests');
  }
  if (/\/documents\/upload\/?$/.test(raw) || raw.includes('/documents/upload?')) {
    return raw.replace(/\/documents\/upload.*/, '/documents');
  }
  if (/\/estates\/new\/?$/.test(raw) || raw.includes('/estates/new?')) {
    return '/(app)/estates';
  }
  if (/\/events\/new\/?$/.test(raw) || raw.includes('/events/new?')) {
    return raw.replace(/\/events\/new.*/, '/events');
  }
  return raw;
}

/** After a successful purchase, returnTo may include gated screens (e.g. create property). */
export function resolvePurchaseReturnTo(returnTo?: string | string[]): string {
  const raw = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  if (!raw || typeof raw !== 'string') return '/(app)/home';
  if (!raw.startsWith('/(app)/') && !raw.startsWith('/(onboarding)/')) return '/(app)/home';
  if (raw.includes('/settings/paywall')) return '/(app)/home';
  return raw;
}
