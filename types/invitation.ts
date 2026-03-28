export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'revoked';
export type InvitationRole = 'guest' | 'admin' | 'owner';

export interface Invitation {
  id: string;
  estateId: string;
  ownerId: string;
  inviteCode: string;
  guestEmail?: string;   // optional — code-based invites may not have an email
  guestId?: string;
  role?: InvitationRole;
  status: InvitationStatus;
  message?: string;
  createdAt: string;
  respondedAt?: string;
}
