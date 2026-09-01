import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { GuestProfile } from '@/types';
import { supabase } from '@/lib/supabase';
import { dedupeById } from '@/lib/dedup-by-id';

function fromDb(row: Record<string, unknown>): GuestProfile {
  return {
    id: row.id as string,
    estateId: row.estate_id as string,
    createdBy: (row.created_by as string) ?? '',
    name: (row.name as string) ?? '',
    calendarColor: (row.calendar_color as string | undefined) || undefined,
    createdAt: (row.created_at ?? '') as string,
  };
}

function toDb(p: GuestProfile) {
  return {
    id: p.id,
    estate_id: p.estateId,
    created_by: p.createdBy || undefined,
    name: p.name.trim(),
    calendar_color: p.calendarColor ?? null,
    created_at: p.createdAt,
  };
}

interface GuestProfileState {
  profiles: GuestProfile[];
  setProfiles: (profiles: GuestProfile[]) => void;
  fetchFromSupabase: () => Promise<void>;
  addProfile: (profile: GuestProfile) => Promise<{ error: string | null }>;
  updateProfile: (id: string, patch: Partial<Pick<GuestProfile, 'name' | 'calendarColor'>>) => Promise<{ error: string | null }>;
  deleteProfile: (id: string) => Promise<{ error: string | null }>;
  getByEstate: (estateId: string) => GuestProfile[];
}

export const useGuestProfileStore = create<GuestProfileState>()(
  persist(
    (set, get) => ({
      profiles: [],
      setProfiles: (profiles) => set({ profiles }),
      fetchFromSupabase: async () => {
        const { data, error } = await supabase.from('estate_guest_profiles').select('*');
        if (error) throw new Error(error.message);
        if (data) set({ profiles: dedupeById(data).map(fromDb) });
      },
      addProfile: async (profile) => {
        const named = { ...profile, name: profile.name.trim() };
        set((s) => ({ profiles: [...s.profiles, named] }));
        const { error } = await supabase.from('estate_guest_profiles').insert(toDb(named));
        if (error) {
          set((s) => ({ profiles: s.profiles.filter((p) => p.id !== named.id) }));
          return { error: error.message };
        }
        return { error: null };
      },
      updateProfile: async (id, patch) => {
        const previous = get().profiles;
        set((s) => ({
          profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
        const dbPatch: Record<string, unknown> = {};
        if (patch.name !== undefined) dbPatch.name = patch.name.trim();
        if (patch.calendarColor !== undefined) dbPatch.calendar_color = patch.calendarColor;
        const { error } = await supabase.from('estate_guest_profiles').update(dbPatch).eq('id', id);
        if (error) {
          set({ profiles: previous });
          return { error: error.message };
        }
        return { error: null };
      },
      deleteProfile: async (id) => {
        const previous = get().profiles;
        set((s) => ({ profiles: s.profiles.filter((p) => p.id !== id) }));
        const { error } = await supabase.from('estate_guest_profiles').delete().eq('id', id);
        if (error) {
          set({ profiles: previous });
          return { error: error.message };
        }
        return { error: null };
      },
      getByEstate: (estateId) =>
        get()
          .profiles.filter((p) => p.estateId === estateId)
          .sort((a, b) => a.name.localeCompare(b.name)),
    }),
    {
      name: '@estateaid/guest-profiles',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
