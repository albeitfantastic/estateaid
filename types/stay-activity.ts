export interface StayActivity {
  id: string;
  estateId: string;
  name: string;
  description?: string;
  address?: string;
  /** Google place_id so Maps opens the exact business / street number. */
  placeId?: string;
  website?: string;
  contactId?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}
