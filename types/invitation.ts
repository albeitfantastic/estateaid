export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'revoked';

export interface Invitation {
  id: string;
  estateId: string;
  ownerId: string;
  inviteCode: string;
  guestEmail?: string;   // optional — code-based invites may not have an email
  guestId?: string;
  status: InvitationStatus;
  message?: string;
  createdAt: string;
  respondedAt?: string;
}
