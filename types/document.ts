export type DocumentCategory = 'guide' | 'manual' | 'rule' | 'emergency' | 'other';

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
