import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EstateEvent } from '@/types';
import { supabase } from '@/lib/supabase';
import { dedupeById } from '@/lib/dedup-by-id';

function fromDb(row: Record<string, unknown>): EstateEvent {
  return {
    id: row.id as string,
    estateId: row.estate_id as string,
    title: row.title as string,
    description: row.description as string | undefined,
    type: row.type as EstateEvent['type'],
    date: row.date as string | undefined,
    recurrence: row.recurrence as EstateEvent['recurrence'] | undefined,
    color: row.color as string | undefined,
    createdAt: (row.created_at ?? '') as string,
  };
}

function toDb(e: EstateEvent) {
  return {
    id: e.id,
    estate_id: e.estateId,
    title: e.title,
    description: e.description,
    type: e.type,
    date: e.date,
    recurrence: e.recurrence ?? null,
    color: e.color,
    created_at: e.createdAt,
  };
}

interface EventState {
  events: EstateEvent[];
  setEvents: (events: EstateEvent[]) => void;
  fetchFromSupabase: () => Promise<void>;
  addEvent: (event: EstateEvent) => Promise<{ error: string | null }>;
  updateEvent: (id: string, patch: Partial<EstateEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEventsByEstate: (estateId: string) => EstateEvent[];
}

export const useEventStore = create<EventState>()(
  persist(
    (set, get) => ({
      events: [],
      setEvents: (events) => set({ events }),
      fetchFromSupabase: async () => {
        const { data } = await supabase.from('estate_events').select('*');
        if (data) set({ events: dedupeById(data).map(fromDb) });
      },
      addEvent: async (event) => {
        set((s) => ({ events: [...s.events, event] }));
        const { error } = await supabase.from('estate_events').insert(toDb(event));
        if (error) {
          set((s) => ({ events: s.events.filter((e) => e.id !== event.id) }));
          return { error: error.message };
        }
        return { error: null };
      },
      updateEvent: async (id, patch) => {
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        }));
        const dbPatch: Record<string, unknown> = {};
        if (patch.title !== undefined) dbPatch.title = patch.title;
        if (patch.description !== undefined) dbPatch.description = patch.description;
        if (patch.type !== undefined) dbPatch.type = patch.type;
        if (patch.date !== undefined) dbPatch.date = patch.date;
        if (patch.recurrence !== undefined) dbPatch.recurrence = patch.recurrence;
        if (patch.color !== undefined) dbPatch.color = patch.color;
        await supabase.from('estate_events').update(dbPatch).eq('id', id);
      },
      deleteEvent: async (id) => {
        set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
        await supabase.from('estate_events').delete().eq('id', id);
      },
      getEventsByEstate: (estateId) =>
        get().events.filter((e) => e.estateId === estateId),
    }),
    {
      name: '@estateaid/events',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
