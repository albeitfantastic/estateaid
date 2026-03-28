import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EstateContact } from '@/types';

interface ContactState {
  contacts: EstateContact[];
  setContacts: (contacts: EstateContact[]) => void;
  addContact: (contact: EstateContact) => void;
  updateContact: (id: string, patch: Partial<EstateContact>) => void;
  deleteContact: (id: string) => void;
  reorderContacts: (estateId: string, orderedIds: string[]) => void;
  getContactsByEstate: (estateId: string) => EstateContact[];
}

export const useContactStore = create<ContactState>()(
  persist(
    (set, get) => ({
      contacts: [],
      setContacts: (contacts) => set({ contacts }),
      addContact: (contact) =>
        set((s) => ({ contacts: [...s.contacts, contact] })),
      updateContact: (id, patch) =>
        set((s) => ({
          contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      deleteContact: (id) =>
        set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) })),
      reorderContacts: (estateId, orderedIds) =>
        set((s) => ({
          contacts: s.contacts.map((c) => {
            if (c.estateId !== estateId) return c;
            const idx = orderedIds.indexOf(c.id);
            return idx >= 0 ? { ...c, order: idx } : c;
          }),
        })),
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
