export type StayStatus =
  | 'pending'
  | 'approved'
  | 'declined'
  | 'alternative_proposed'
  | 'question_asked'
  | 'cancelled';

export interface StayRequest {
  id: string;
  estateId: string;
  guestId: string;
  requestedFrom: string; // "YYYY-MM-DD"
  requestedTo: string;   // "YYYY-MM-DD"
  status: StayStatus;
  guestNote?: string;
  ownerNote?: string;
  alternativeFrom?: string;
  alternativeTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Stay {
  id: string;
  stayRequestId: string;
  estateId: string;
  guestId: string;
  from: string; // "YYYY-MM-DD"
  to: string;   // "YYYY-MM-DD"
}
