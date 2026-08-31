export type InvitationStatus = 'pending' | 'declined' | 'revoked' | 'accepted';

/** Access level on a specific estate when accepting an invite (not an account type). */
export type EstateInviteRole = 'guest' | 'owner';

export interface Invitation {
  id: string;
  estateId: string;
  ownerId: string;
  inviteCode: string;
  /**
   * Optional. If set, redeem requires session email to match (case-insensitive).
   * If omitted or blank, invite is open: any signed-in user may redeem once (single-use code).
   */
  guestEmail?: string;
  /** Optional label for who the invite was sent to (display only). */
  inviteeLabel?: string;
  guestId?: string;
  /** Owner vs guest on this property only. */
  role?: EstateInviteRole;
  status: InvitationStatus;
  message?: string;
  createdAt: string;
  respondedAt?: string;
}

/** @deprecated Use EstateInviteRole */
export type InvitationRole = EstateInviteRole;

/** Normalize legacy DB/app values `coOwner` / `owner` → `owner`. */
export function normalizeInviteRole(role: string | null | undefined): EstateInviteRole {
  if (role === 'coOwner' || role === 'owner') return 'owner';
  return 'guest';
}
