import type { Invitation } from '@/types';

/** Who a pending invite was intended for (label or email). */
export function pendingInviteRecipient(inv: Invitation): string | undefined {
  const label = inv.inviteeLabel?.trim();
  if (label) return label;
  const email = inv.guestEmail?.trim();
  if (email) return email;
  return undefined;
}
