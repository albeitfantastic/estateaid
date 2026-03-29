import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Estate } from '@/types';
import { supabase } from '@/lib/supabase';

function fromDb(row: Record<string, unknown>): Estate {
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
    name: row.name as string,
    location: (row.location ?? '') as string,
    coverImageUrl: row.cover_image_url as string | undefined,
    description: row.description as string | undefined,
    timeZone: (row.time_zone ?? 'UTC') as string,
    createdAt: row.created_at as string,
  };
}

function remoteImageUrlOnly(url: string | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('https://') || url.startsWith('http://')) return url;
  return null;
}

function toDb(estate: Estate) {
  return {
    id: estate.id,
    owner_id: estate.ownerId,
    name: estate.name,
    location: estate.location,
    cover_image_url: remoteImageUrlOnly(estate.coverImageUrl),
    description: estate.description ?? null,
    time_zone: estate.timeZone,
    created_at: estate.createdAt,
  };
}

interface EstateState {
  estates: Estate[];
  setEstates: (estates: Estate[]) => void;
  fetchFromSupabase: () => Promise<void>;
  addEstate: (estate: Estate) => Promise<{ error: string | null }>;
  updateEstate: (id: string, patch: Partial<Estate>) => Promise<void>;
  deleteEstate: (id: string) => Promise<void>;
  getEstateById: (id: string) => Estate | undefined;
  getEstatesByOwner: (ownerId: string) => Estate[];
}

export const useEstateStore = create<EstateState>()(
  persist(
    (set, get) => ({
      estates: [],
      setEstates: (estates) => set({ estates }),
      fetchFromSupabase: async () => {
        const { data } = await supabase.from('estates').select('*');
        if (data) set({ estates: data.map(fromDb) });
      },
      addEstate: async (estate) => {
        set((s) => ({ estates: [...s.estates, estate] }));
        const { error } = await supabase.from('estates').insert(toDb(estate));
        if (error) {
          set((s) => ({ estates: s.estates.filter((e) => e.id !== estate.id) }));
          return { error: error.message };
        }
        return { error: null };
      },
      updateEstate: async (id, patch) => {
        set((s) => ({
          estates: s.estates.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        }));
        const dbPatch: Record<string, unknown> = {};
        if (patch.name !== undefined) dbPatch.name = patch.name;
        if (patch.location !== undefined) dbPatch.location = patch.location;
        if (patch.coverImageUrl !== undefined) dbPatch.cover_image_url = patch.coverImageUrl;
        if (patch.description !== undefined) dbPatch.description = patch.description;
        if (patch.timeZone !== undefined) dbPatch.time_zone = patch.timeZone;
        await supabase.from('estates').update(dbPatch).eq('id', id);
      },
      deleteEstate: async (id) => {
        set((s) => ({ estates: s.estates.filter((e) => e.id !== id) }));
        await supabase.from('estates').delete().eq('id', id);
      },
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
