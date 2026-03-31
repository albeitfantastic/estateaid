export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'revoked';
export type InvitationRole = 'guest' | 'owner';

export interface Invitation {
  id: string;
  estateId: string;
  ownerId: string;
  inviteCode: string;
  /** Required for new invites: redeem only works when session email matches (case-insensitive). */
  guestEmail?: string;
  guestId?: string;
  role?: InvitationRole;
  status: InvitationStatus;
  message?: string;
  createdAt: string;
  respondedAt?: string;
}
