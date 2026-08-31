import { guestEmailsMatch } from '@/lib/invite-email';
import type { PropertyRole } from '@/lib/entitlements/capabilities';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { Invitation, normalizeInviteRole, type EstateInviteRole } from '@/types';

/**
 * Returns the invitation role the given user has on an estate.
 * Returns null if no accepted invitation exists for that estate/user.
 */
export function getEstateRole(
  invitations: Invitation[],
  estateId: string,
  userId: string,
  userEmail?: string | null
): EstateInviteRole | null {
  const match = invitations.find(
    (inv) =>
      inv.estateId === estateId &&
      inv.status === 'accepted' &&
      (inv.guestId === userId || guestEmailsMatch(inv.guestEmail, userEmail ?? undefined))
  );
  if (!match) return null;
  return normalizeInviteRole(match.role);
}

/** Full estate role including sponsorship (sponsor | owner | guest | none). */
export function getEstateActorRole(
  estates: { id: string; ownerId: string; sponsorUserId: string }[],
  invitations: Invitation[],
  estateId: string,
  userId: string,
  userEmail?: string | null
): PropertyRole {
  if (!userId) return 'none';
  const estate = estates.find((e) => e.id === estateId);
  if (!estate) {
    const invRole = getEstateRole(invitations, estateId, userId, userEmail);
    if (invRole === 'owner') return 'owner';
    if (invRole === 'guest') return 'guest';
    return 'none';
  }
  if (estate.sponsorUserId === userId) return 'sponsor';
  if (estate.ownerId === userId) return 'owner';
  const invRole = getEstateRole(invitations, estateId, userId, userEmail);
  if (invRole === 'owner') return 'owner';
  if (invRole === 'guest') return 'guest';
  return 'none';
}

/** Hook: invitation role only (guest | owner). */
export function useEstateRole(estateId: string): EstateInviteRole | null {
  const invitations = useInvitationStore((s) => s.invitations);
  const currentUser = useAuthStore((s) => s.currentUser);
  if (!currentUser) return null;
  return getEstateRole(invitations, estateId, currentUser.id, currentUser.email);
}

/** Hook: full actor role including sponsor. */
export function useEstateActorRole(estateId: string): PropertyRole {
  const invitations = useInvitationStore((s) => s.invitations);
  const estates = useEstateStore((s) => s.estates);
  const currentUser = useAuthStore((s) => s.currentUser);
  if (!currentUser) return 'none';
  return getEstateActorRole(estates, invitations, estateId, currentUser.id, currentUser.email);
}
