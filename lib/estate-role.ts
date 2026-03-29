import { useAuthStore } from '@/store/auth-store';
import { useInvitationStore } from '@/store/invitation-store';
import { Invitation, InvitationRole } from '@/types';

/**
 * Returns the invitation role the given user has on an estate.
 * Returns null if no accepted invitation exists for that estate/user.
 */
export function getEstateRole(
  invitations: Invitation[],
  estateId: string,
  userId: string,
  userEmail?: string | null
): InvitationRole | null {
  const match = invitations.find(
    (inv) =>
      inv.estateId === estateId &&
      inv.status === 'accepted' &&
      (inv.guestId === userId || (userEmail && inv.guestEmail === userEmail))
  );
  if (!match) return null;
  return match.role ?? 'guest';
}

/** Hook that returns the current user's invitation role on a given estate. */
export function useEstateRole(estateId: string): InvitationRole | null {
  const invitations = useInvitationStore((s) => s.invitations);
  const currentUser = useAuthStore((s) => s.currentUser);
  if (!currentUser) return null;
  return getEstateRole(invitations, estateId, currentUser.id, currentUser.email);
}
