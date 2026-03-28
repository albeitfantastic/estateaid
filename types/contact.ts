export type ContactCategory =
  | 'emergency'
  | 'utility'
  | 'neighbor'
  | 'staff'
  | 'service'
  | 'other';

export interface EstateContact {
  id: string;
  estateId: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  category: ContactCategory;
  notes?: string;
  order: number;
  createdAt: string;
}
