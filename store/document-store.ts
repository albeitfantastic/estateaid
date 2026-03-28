import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EstateDocument, DocumentCategory } from '@/types';

interface DocumentState {
  documents: EstateDocument[];
  setDocuments: (documents: EstateDocument[]) => void;
  addDocument: (document: EstateDocument) => void;
  updateDocument: (id: string, patch: Partial<EstateDocument>) => void;
  deleteDocument: (id: string) => void;
  getDocumentsByEstate: (estateId: string) => EstateDocument[];
  getDocumentsByCategory: (estateId: string, category: DocumentCategory) => EstateDocument[];
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      documents: [],
      setDocuments: (documents) => set({ documents }),
      addDocument: (document) =>
        set((s) => ({ documents: [...s.documents, document] })),
      updateDocument: (id, patch) =>
        set((s) => ({
          documents: s.documents.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),
      deleteDocument: (id) =>
        set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),
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
