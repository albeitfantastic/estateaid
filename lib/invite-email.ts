/** Normalize invitee email for comparison (trim + lowercase). */
export function normalizeGuestEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function guestEmailsMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a?.trim() || !b?.trim()) return false;
  return normalizeGuestEmail(a) === normalizeGuestEmail(b);
}

/** Basic check for invite creation — not full RFC validation. */
export function isPlausibleInviteEmail(email: string): boolean {
  const e = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
