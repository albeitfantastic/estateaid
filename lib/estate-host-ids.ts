import type { Invitation } from '@/types/invitation';
import { normalizeInviteRole } from '@/types/invitation';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';

export type EstateHostKind = 'sponsor' | 'host';

export type EstateHostPerson = {
  userId: string;
  kind: EstateHostKind;
};

type EstateHostFields = {
  sponsorUserId?: string;
  ownerId?: string;
};

/** Hosts with access to a property: sponsor, legacy owner, accepted host invites. */
export function hostsForEstateFrom(
  estate: EstateHostFields | undefined,
  invitations: Invitation[],
  estateId: string
): EstateHostPerson[] {
  const byId = new Map<string, EstateHostPerson>();
  if (estate?.sponsorUserId) {
    byId.set(estate.sponsorUserId, { userId: estate.sponsorUserId, kind: 'sponsor' });
  }
  if (estate?.ownerId && !byId.has(estate.ownerId)) {
    byId.set(estate.ownerId, { userId: estate.ownerId, kind: 'host' });
  }
  for (const inv of invitations) {
    if (
      inv.estateId === estateId &&
      inv.status === 'accepted' &&
      normalizeInviteRole(inv.role) === 'owner' &&
      inv.guestId &&
      !byId.has(inv.guestId)
    ) {
      byId.set(inv.guestId, { userId: inv.guestId, kind: 'host' });
    }
  }
  return [...byId.values()];
}

/**
 * User ids that should receive host-facing pushes for a property (spec §13):
 * the sponsor, the legacy `ownerId` if different, and every accepted host invite.
 */
export function hostUserIdsForEstate(estateId: string): string[] {
  const estate = useEstateStore.getState().getEstateById(estateId);
  const invitations = useInvitationStore.getState().invitations;
  return hostsForEstateFrom(estate, invitations, estateId).map((h) => h.userId);
}
