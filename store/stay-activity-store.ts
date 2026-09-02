import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StayActivity } from '@/types';
import { supabase } from '@/lib/supabase';
import { dedupeById } from '@/lib/dedup-by-id';

function fromDb(row: Record<string, unknown>): StayActivity {
  return {
    id: row.id as string,
    estateId: row.estate_id as string,
    name: row.name as string,
    description:
      row.description != null && row.description !== '' ? String(row.description) : undefined,
    address: row.address != null && row.address !== '' ? String(row.address) : undefined,
    placeId: row.place_id != null && row.place_id !== '' ? String(row.place_id) : undefined,
    website: row.website != null && row.website !== '' ? String(row.website) : undefined,
    contactId: row.contact_id != null && row.contact_id !== '' ? String(row.contact_id) : undefined,
    order: (row.order ?? 0) as number,
    createdAt: (row.created_at ?? '') as string,
    updatedAt: (row.updated_at ?? '') as string,
  };
}

function toDb(a: StayActivity) {
  return {
    id: a.id,
    estate_id: a.estateId,
    name: a.name,
    description: a.description ?? null,
    address: a.address ?? null,
    place_id: a.placeId ?? null,
    website: a.website ?? null,
    contact_id: a.contactId ?? null,
    order: a.order,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
  };
}

interface StayActivityState {
  activities: StayActivity[];
  setActivities: (activities: StayActivity[]) => void;
  fetchFromSupabase: () => Promise<void>;
  addActivity: (activity: StayActivity) => Promise<{ error: string | null }>;
  updateActivity: (id: string, patch: Partial<StayActivity>) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  getActivitiesByEstate: (estateId: string) => StayActivity[];
}

export const useStayActivityStore = create<StayActivityState>()(
  persist(
    (set, get) => ({
      activities: [],
      setActivities: (activities) => set({ activities }),
      fetchFromSupabase: async () => {
        const { data, error } = await supabase.from('estate_stay_activities').select('*');
        if (error) throw new Error(error.message);
        if (data) set({ activities: dedupeById(data).map(fromDb) });
      },
      addActivity: async (activity) => {
        set((s) => ({ activities: [...s.activities, activity] }));
        const { error } = await supabase.from('estate_stay_activities').insert(toDb(activity));
        if (error) {
          set((s) => ({ activities: s.activities.filter((a) => a.id !== activity.id) }));
          return { error: error.message };
        }
        return { error: null };
      },
      updateActivity: async (id, patch) => {
        const updatedAt = new Date().toISOString();
        set((s) => ({
          activities: s.activities.map((a) => (a.id === id ? { ...a, ...patch, updatedAt } : a)),
        }));
        const dbPatch: Record<string, unknown> = { updated_at: updatedAt };
        if (patch.name !== undefined) dbPatch.name = patch.name;
        if (patch.description !== undefined) dbPatch.description = patch.description ?? null;
        if (patch.address !== undefined) dbPatch.address = patch.address ?? null;
        if (Object.prototype.hasOwnProperty.call(patch, 'placeId')) {
          dbPatch.place_id = patch.placeId ?? null;
        }
        if (patch.website !== undefined) dbPatch.website = patch.website ?? null;
        if (Object.prototype.hasOwnProperty.call(patch, 'contactId')) {
          dbPatch.contact_id = patch.contactId ?? null;
        }
        if (patch.order !== undefined) dbPatch.order = patch.order;
        await supabase.from('estate_stay_activities').update(dbPatch).eq('id', id);
      },
      deleteActivity: async (id) => {
        set((s) => ({ activities: s.activities.filter((a) => a.id !== id) }));
        await supabase.from('estate_stay_activities').delete().eq('id', id);
      },
      getActivitiesByEstate: (estateId) =>
        get()
          .activities.filter((a) => a.estateId === estateId)
          .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt)),
    }),
    {
      name: '@maison/stay-activities',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
