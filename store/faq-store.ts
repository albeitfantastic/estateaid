import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FaqItem } from '@/types';
import { supabase } from '@/lib/supabase';
import { dedupeById } from '@/lib/dedup-by-id';

function fromDb(row: Record<string, unknown>): FaqItem {
  return {
    id: row.id as string,
    estateId: row.estate_id as string,
    question: row.question as string,
    answer: (row.answer ?? '') as string,
    order: (row.order ?? 0) as number,
    createdAt: (row.created_at ?? '') as string,
    updatedAt: (row.updated_at ?? '') as string,
  };
}

function toDb(f: FaqItem) {
  return {
    id: f.id,
    estate_id: f.estateId,
    question: f.question,
    answer: f.answer,
    order: f.order,
    created_at: f.createdAt,
    updated_at: f.updatedAt,
  };
}

interface FaqState {
  faqs: FaqItem[];
  setFaqs: (faqs: FaqItem[]) => void;
  fetchFromSupabase: () => Promise<void>;
  addFaq: (faq: FaqItem) => Promise<{ error: string | null }>;
  updateFaq: (id: string, patch: Partial<FaqItem>) => Promise<void>;
  deleteFaq: (id: string) => Promise<void>;
  reorderFaqs: (estateId: string, orderedIds: string[]) => Promise<void>;
  getFaqsByEstate: (estateId: string) => FaqItem[];
}

export const useFaqStore = create<FaqState>()(
  persist(
    (set, get) => ({
      faqs: [],
      setFaqs: (faqs) => set({ faqs }),
      fetchFromSupabase: async () => {
        const { data, error } = await supabase.from('faqs').select('*');
        if (error) throw new Error(error.message);
        if (data) set({ faqs: dedupeById(data).map(fromDb) });
      },
      addFaq: async (faq) => {
        set((s) => ({ faqs: [...s.faqs, faq] }));
        const { error } = await supabase.from('faqs').insert(toDb(faq));
        if (error) {
          console.warn('addFaq: Supabase insert failed', error.message);
          set((s) => ({ faqs: s.faqs.filter((f) => f.id !== faq.id) }));
          return { error: error.message };
        }
        return { error: null };
      },
      updateFaq: async (id, patch) => {
        set((s) => ({
          faqs: s.faqs.map((f) =>
            f.id === id ? { ...f, ...patch, updatedAt: new Date().toISOString() } : f
          ),
        }));
        const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (patch.question !== undefined) dbPatch.question = patch.question;
        if (patch.answer !== undefined) dbPatch.answer = patch.answer;
        if (patch.order !== undefined) dbPatch.order = patch.order;
        await supabase.from('faqs').update(dbPatch).eq('id', id);
      },
      deleteFaq: async (id) => {
        set((s) => ({ faqs: s.faqs.filter((f) => f.id !== id) }));
        await supabase.from('faqs').delete().eq('id', id);
      },
      reorderFaqs: async (estateId, orderedIds) => {
        set((s) => ({
          faqs: s.faqs.map((f) => {
            if (f.estateId !== estateId) return f;
            const idx = orderedIds.indexOf(f.id);
            return idx >= 0 ? { ...f, order: idx } : f;
          }),
        }));
        await Promise.all(
          orderedIds.map((id, idx) =>
            supabase.from('faqs').update({ order: idx }).eq('id', id)
          )
        );
      },
      getFaqsByEstate: (estateId) =>
        get()
          .faqs.filter((f) => f.estateId === estateId)
          .sort((a, b) => a.order - b.order),
    }),
    {
      name: '@maison/faqs',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
