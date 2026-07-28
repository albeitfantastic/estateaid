import { dedupeById } from '@/lib/dedup-by-id';
import { supabase } from '@/lib/supabase';
import { DocumentCategory, EstateDocument } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

function fromDb(row: Record<string, unknown>): EstateDocument {
  return {
    id: row.id as string,
    estateId: row.estate_id as string,
    title: row.title as string,
    description: row.description as string | undefined,
    fileUri: (row.file_uri ?? '') as string,
    mimeType: (row.mime_type ?? '') as string,
    fileSizeBytes: (row.file_size_bytes ?? 0) as number,
    category: row.category as DocumentCategory,
    uploadedBy: (row.uploaded_by ?? '') as string,
    createdAt: (row.created_at ?? '') as string,
  };
}

function toDb(d: EstateDocument) {
  return {
    id: d.id,
    estate_id: d.estateId,
    title: d.title,
    description: d.description,
    file_uri: d.fileUri,
    mime_type: d.mimeType,
    file_size_bytes: d.fileSizeBytes,
    category: d.category,
    uploaded_by: d.uploadedBy,
    created_at: d.createdAt,
  };
}

interface DocumentState {
  documents: EstateDocument[];
  setDocuments: (documents: EstateDocument[]) => void;
  fetchFromSupabase: () => Promise<void>;
  addDocument: (document: EstateDocument) => Promise<void>;
  updateDocument: (id: string, patch: Partial<EstateDocument>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  getDocumentsByEstate: (estateId: string) => EstateDocument[];
  getDocumentsByCategory: (estateId: string, category: DocumentCategory) => EstateDocument[];
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      documents: [],
      setDocuments: (documents) => set({ documents }),
      fetchFromSupabase: async () => {
        const { data } = await supabase.from('estate_documents').select('*');
        if (data) set({ documents: dedupeById(data).map(fromDb) });
      },
      addDocument: async (document) => {
        set((s) => ({ documents: [...s.documents, document] }));
        const { error } = await supabase.from('estate_documents').insert(toDb(document));
        if (error) set((s) => ({ documents: s.documents.filter((d) => d.id !== document.id) }));
      },
      updateDocument: async (id, patch) => {
        set((s) => ({
          documents: s.documents.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        }));
        const dbPatch: Record<string, unknown> = {};
        if (patch.title !== undefined) dbPatch.title = patch.title;
        if (patch.description !== undefined) dbPatch.description = patch.description;
        if (patch.fileUri !== undefined) dbPatch.file_uri = patch.fileUri;
        if (patch.mimeType !== undefined) dbPatch.mime_type = patch.mimeType;
        if (patch.fileSizeBytes !== undefined) dbPatch.file_size_bytes = patch.fileSizeBytes;
        if (patch.category !== undefined) dbPatch.category = patch.category;
        await supabase.from('estate_documents').update(dbPatch).eq('id', id);
      },
      deleteDocument: async (id) => {
        set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }));
        await supabase.from('estate_documents').delete().eq('id', id);
      },
      getDocumentsByEstate: (estateId) =>
        get().documents.filter((d) => d.estateId === estateId),
      getDocumentsByCategory: (estateId, category) =>
        get().documents.filter((d) => d.estateId === estateId && d.category === category),
    }),
    {
      name: '@estateaid/documents',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
