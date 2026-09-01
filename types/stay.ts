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
  /** Total people visiting, including the requester. */
  guestCount: number;
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
  /** Auth user when the guest has an account. */
  guestId?: string;
  /** Named guest without the app. Mutually exclusive with guestId. */
  guestProfileId?: string;
  from: string; // "YYYY-MM-DD"
  to: string;   // "YYYY-MM-DD"
  /** Total people visiting, including the named guest. */
  guestCount: number;
}
