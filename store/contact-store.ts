import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EstateContact } from '@/types';
import { supabase } from '@/lib/supabase';
import { dedupeById } from '@/lib/dedup-by-id';

function fromDb(row: Record<string, unknown>): EstateContact {
  return {
    id: row.id as string,
    estateId: row.estate_id as string,
    name: row.name as string,
    role: (row.role ?? '') as string,
    phone: row.phone as string | undefined,
    email: row.email as string | undefined,
    category: row.category as EstateContact['category'],
    notes: row.notes as string | undefined,
    order: (row.order ?? 0) as number,
    createdAt: (row.created_at ?? '') as string,
  };
}

function toDb(c: EstateContact) {
  return {
    id: c.id,
    estate_id: c.estateId,
    name: c.name,
    role: c.role,
    phone: c.phone,
    email: c.email,
    category: c.category,
    notes: c.notes,
    order: c.order,
    created_at: c.createdAt,
  };
}

interface ContactState {
  contacts: EstateContact[];
  setContacts: (contacts: EstateContact[]) => void;
  fetchFromSupabase: () => Promise<void>;
  addContact: (contact: EstateContact) => Promise<void>;
  updateContact: (id: string, patch: Partial<EstateContact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  reorderContacts: (estateId: string, orderedIds: string[]) => Promise<void>;
  getContactsByEstate: (estateId: string) => EstateContact[];
}

export const useContactStore = create<ContactState>()(
  persist(
    (set, get) => ({
      contacts: [],
      setContacts: (contacts) => set({ contacts }),
      fetchFromSupabase: async () => {
        const { data } = await supabase.from('estate_contacts').select('*');
        if (data) set({ contacts: dedupeById(data).map(fromDb) });
      },
      addContact: async (contact) => {
        set((s) => ({ contacts: [...s.contacts, contact] }));
        const { error } = await supabase.from('estate_contacts').insert(toDb(contact));
        if (error) set((s) => ({ contacts: s.contacts.filter((c) => c.id !== contact.id) }));
      },
      updateContact: async (id, patch) => {
        set((s) => ({
          contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }));
        const dbPatch: Record<string, unknown> = {};
        if (patch.name !== undefined) dbPatch.name = patch.name;
        if (patch.role !== undefined) dbPatch.role = patch.role;
        if (patch.phone !== undefined) dbPatch.phone = patch.phone;
        if (patch.email !== undefined) dbPatch.email = patch.email;
        if (patch.category !== undefined) dbPatch.category = patch.category;
        if (patch.notes !== undefined) dbPatch.notes = patch.notes;
        if (patch.order !== undefined) dbPatch.order = patch.order;
        await supabase.from('estate_contacts').update(dbPatch).eq('id', id);
      },
      deleteContact: async (id) => {
        set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) }));
        await supabase.from('estate_contacts').delete().eq('id', id);
      },
      reorderContacts: async (estateId, orderedIds) => {
        set((s) => ({
          contacts: s.contacts.map((c) => {
            if (c.estateId !== estateId) return c;
            const idx = orderedIds.indexOf(c.id);
            return idx >= 0 ? { ...c, order: idx } : c;
          }),
        }));
        await Promise.all(
          orderedIds.map((id, idx) =>
            supabase.from('estate_contacts').update({ order: idx }).eq('id', id)
          )
        );
      },
      getContactsByEstate: (estateId) =>
        get()
          .contacts.filter((c) => c.estateId === estateId)
          .sort((a, b) => a.order - b.order),
    }),
    {
      name: '@estateaid/contacts',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
