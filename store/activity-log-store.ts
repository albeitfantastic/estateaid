import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EstateActivityAction, EstateActivityEntry } from '@/types';
import { supabase } from '@/lib/supabase';
import { dedupeById } from '@/lib/dedup-by-id';
import { generateUuidV4 } from '@/lib/id';

function fromDb(row: Record<string, unknown>): EstateActivityEntry {
  return {
    id: row.id as string,
    estateId: row.estate_id as string,
    actorId: row.actor_id as string,
    action: row.action as EstateActivityAction,
    metadata: (row.metadata ?? undefined) as Record<string, unknown> | undefined,
    createdAt: row.created_at as string,
  };
}

function toDb(entry: EstateActivityEntry) {
  return {
    id: entry.id,
    estate_id: entry.estateId,
    actor_id: entry.actorId,
    action: entry.action,
    metadata: entry.metadata ?? null,
    created_at: entry.createdAt,
  };
}

interface ActivityLogState {
  entries: EstateActivityEntry[];
  setEntries: (entries: EstateActivityEntry[]) => void;
  fetchFromSupabase: () => Promise<void>;
  logActivity: (
    estateId: string,
    actorId: string,
    action: EstateActivityAction,
    metadata?: Record<string, unknown>
  ) => void;
  getEntriesByEstate: (estateId: string) => EstateActivityEntry[];
}

export const useActivityLogStore = create<ActivityLogState>()(
  persist(
    (set, get) => ({
      entries: [],
      setEntries: (entries) => set({ entries }),
      fetchFromSupabase: async () => {
        const { data, error } = await supabase.from('estate_activity_log').select('*');
        if (error) throw new Error(error.message);
        if (data != null) {
          set({ entries: dedupeById(data).map(fromDb) });
        }
      },
      logActivity: (estateId, actorId, action, metadata) => {
        const entry: EstateActivityEntry = {
          id: generateUuidV4(),
          estateId,
          actorId,
          action,
          metadata,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ entries: [entry, ...s.entries] }));
        // Fire-and-forget: activity logging must never block or fail the action it records.
        void supabase.from('estate_activity_log').insert(toDb(entry));
      },
      getEntriesByEstate: (estateId) =>
        get()
          .entries.filter((e) => e.estateId === estateId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }),
    {
      name: '@estateaid/activity-log',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
