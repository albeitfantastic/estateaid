export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'revoked';
export type InvitationRole = 'guest' | 'owner';

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
  guestId?: string;
  role?: InvitationRole;
  status: InvitationStatus;
  message?: string;
  createdAt: string;
  respondedAt?: string;
}
