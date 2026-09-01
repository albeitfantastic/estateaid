export type DocumentCategory =
  | 'emergency'
  | 'rule'
  | 'guide'
  | 'manual'
  | 'insurance'
  | 'contract'
  | 'inventory'
  | 'access'
  | 'utility'
  | 'warranty'
  | 'invoice'
  | 'floorplan'
  | 'other';

/** Display order for the upload picker and the documents list. */
export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'emergency',
  'rule',
  'guide',
  'manual',
  'insurance',
  'contract',
  'inventory',
  'access',
  'utility',
  'warranty',
  'invoice',
  'floorplan',
  'other',
];

export interface EstateDocument {
  id: string;
  estateId: string;
  title: string;
  description?: string;
  fileUri: string;
  mimeType: string;
  fileSizeBytes: number;
  category: DocumentCategory;
  uploadedBy: string;
  createdAt: string;
}
