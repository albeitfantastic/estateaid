import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FaqItem } from '@/types';

interface FaqState {
  faqs: FaqItem[];
  setFaqs: (faqs: FaqItem[]) => void;
  addFaq: (faq: FaqItem) => void;
  updateFaq: (id: string, patch: Partial<FaqItem>) => void;
  deleteFaq: (id: string) => void;
  reorderFaqs: (estateId: string, orderedIds: string[]) => void;
  getFaqsByEstate: (estateId: string) => FaqItem[];
}

export const useFaqStore = create<FaqState>()(
  persist(
    (set, get) => ({
      faqs: [],
      setFaqs: (faqs) => set({ faqs }),
      addFaq: (faq) => set((s) => ({ faqs: [...s.faqs, faq] })),
      updateFaq: (id, patch) =>
        set((s) => ({
          faqs: s.faqs.map((f) =>
            f.id === id ? { ...f, ...patch, updatedAt: new Date().toISOString() } : f
          ),
        })),
      deleteFaq: (id) => set((s) => ({ faqs: s.faqs.filter((f) => f.id !== id) })),
      reorderFaqs: (estateId, orderedIds) =>
        set((s) => ({
          faqs: s.faqs.map((f) => {
            if (f.estateId !== estateId) return f;
            const idx = orderedIds.indexOf(f.id);
            return idx >= 0 ? { ...f, order: idx } : f;
          }),
        })),
      getFaqsByEstate: (estateId) =>
        get()
          .faqs.filter((f) => f.estateId === estateId)
          .sort((a, b) => a.order - b.order),
    }),
    {
      name: '@estateaid/faqs',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
