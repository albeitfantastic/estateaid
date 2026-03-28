import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Estate } from '@/types';

interface EstateState {
  estates: Estate[];
  setEstates: (estates: Estate[]) => void;
  addEstate: (estate: Estate) => void;
  updateEstate: (id: string, patch: Partial<Estate>) => void;
  deleteEstate: (id: string) => void;
  getEstateById: (id: string) => Estate | undefined;
  getEstatesByOwner: (ownerId: string) => Estate[];
}

export const useEstateStore = create<EstateState>()(
  persist(
    (set, get) => ({
      estates: [],
      setEstates: (estates) => set({ estates }),
      addEstate: (estate) => set((s) => ({ estates: [...s.estates, estate] })),
      updateEstate: (id, patch) =>
        set((s) => ({
          estates: s.estates.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      deleteEstate: (id) =>
        set((s) => ({ estates: s.estates.filter((e) => e.id !== id) })),
      getEstateById: (id) => get().estates.find((e) => e.id === id),
      getEstatesByOwner: (ownerId) =>
        get().estates.filter((e) => e.ownerId === ownerId),
    }),
    {
      name: '@estateaid/estates',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
