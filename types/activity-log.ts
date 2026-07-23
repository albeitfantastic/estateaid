export type EstateActivityAction =
  | 'estate_created'
  | 'estate_updated'
  | 'invitation_sent'
  | 'invitation_accepted'
  | 'invitation_declined'
  | 'invitation_revoked'
  | 'stay_request_approved'
  | 'stay_request_declined'
  | 'stay_request_alternative_proposed'
  | 'stay_request_cancelled';

export interface EstateActivityEntry {
  id: string;
  estateId: string;
  actorId: string;
  action: EstateActivityAction;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
