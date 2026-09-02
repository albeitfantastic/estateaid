import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { GuestProfile, guestProfileEstateIds } from '@/types';
import { supabase } from '@/lib/supabase';
import { dedupeById } from '@/lib/dedup-by-id';

function normalizeProfile(p: GuestProfile & { estateId?: string }): GuestProfile {
  return {
    id: p.id,
    estateIds: guestProfileEstateIds(p),
    createdBy: p.createdBy,
    name: p.name,
    calendarColor: p.calendarColor,
    createdAt: p.createdAt,
  };
}

function fromDb(row: Record<string, unknown>): GuestProfile {
  const rawIds = row.estate_ids;
  const estateIds = Array.isArray(rawIds)
    ? rawIds.filter((id): id is string => typeof id === 'string')
    : typeof row.estate_id === 'string' && row.estate_id
      ? [row.estate_id]
      : [];
  return {
    id: row.id as string,
    estateIds,
    createdBy: (row.created_by as string) ?? '',
    name: (row.name as string) ?? '',
    calendarColor: (row.calendar_color as string | undefined) || undefined,
    createdAt: (row.created_at ?? '') as string,
  };
}

function toDb(p: GuestProfile) {
  return {
    id: p.id,
    estate_ids: guestProfileEstateIds(p),
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
  updateProfile: (
    id: string,
    patch: Partial<Pick<GuestProfile, 'name' | 'calendarColor' | 'estateIds'>>
  ) => Promise<{ error: string | null }>;
  deleteProfile: (id: string) => Promise<{ error: string | null }>;
  getByEstate: (estateId: string) => GuestProfile[];
}

export const useGuestProfileStore = create<GuestProfileState>()(
  persist(
    (set, get) => ({
      profiles: [],
      setProfiles: (profiles) => set({ profiles: profiles.map(normalizeProfile) }),
      fetchFromSupabase: async () => {
        const { data, error } = await supabase.from('estate_guest_profiles').select('*');
        if (error) throw new Error(error.message);
        if (data) set({ profiles: dedupeById(data).map(fromDb) });
      },
      addProfile: async (profile) => {
        const named = normalizeProfile({ ...profile, name: profile.name.trim() });
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
        if (patch.estateIds !== undefined) dbPatch.estate_ids = patch.estateIds;
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
          .profiles.filter((p) => guestProfileEstateIds(p).includes(estateId))
          .sort((a, b) => a.name.localeCompare(b.name)),
    }),
    {
      name: '@maison/guest-profiles',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted) => {
        const state = persisted as { profiles?: GuestProfile[] };
        return { ...state, profiles: (state.profiles ?? []).map(normalizeProfile) };
      },
    }
  )
);
