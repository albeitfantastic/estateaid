import { normalizeInviteRole } from '@/types/invitation';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';

/**
 * User ids that should receive host-facing pushes for a property (spec §13):
 * the sponsor, the legacy `ownerId` if different, and every accepted host invite.
 */
export function hostUserIdsForEstate(estateId: string): string[] {
  const estate = useEstateStore.getState().getEstateById(estateId);
  const invitations = useInvitationStore.getState().invitations;
  const ids = new Set<string>();
  if (estate?.sponsorUserId) ids.add(estate.sponsorUserId);
  if (estate?.ownerId) ids.add(estate.ownerId);
  for (const inv of invitations) {
    if (
      inv.estateId === estateId &&
      inv.status === 'accepted' &&
      normalizeInviteRole(inv.role) === 'owner' &&
      inv.guestId
    ) {
      ids.add(inv.guestId);
    }
  }
  return [...ids];
}
