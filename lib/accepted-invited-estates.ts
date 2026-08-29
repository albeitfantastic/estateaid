import { guestEmailsMatch } from '@/lib/invite-email';
import type { Invitation } from '@/types';

/** Estate ids the user can access via an accepted invitation (guest or co-owner invite). */
export function acceptedInvitedEstateIds(
  invitations: Invitation[],
  userId: string | undefined,
  userEmail: string | undefined | null
): string[] {
  if (!userId && !userEmail?.trim()) return [];
  return invitations
    .filter(
      (inv) =>
        inv.status === 'accepted' &&
        (inv.guestId === userId || guestEmailsMatch(inv.guestEmail, userEmail ?? undefined))
    )
    .map((inv) => inv.estateId);
}
