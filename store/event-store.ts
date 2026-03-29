import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EstateEvent } from '@/types';

interface EventState {
  events: EstateEvent[];
  setEvents: (events: EstateEvent[]) => void;
  addEvent: (event: EstateEvent) => void;
  updateEvent: (id: string, patch: Partial<EstateEvent>) => void;
  deleteEvent: (id: string) => void;
  getEventsByEstate: (estateId: string) => EstateEvent[];
}

export const useEventStore = create<EventState>()(
  persist(
    (set, get) => ({
      events: [],
      setEvents: (events) => set({ events }),
      addEvent: (event) => set((s) => ({ events: [...s.events, event] })),
      updateEvent: (id, patch) =>
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      deleteEvent: (id) =>
        set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
      getEventsByEstate: (estateId) =>
        get().events.filter((e) => e.estateId === estateId),
    }),
    {
      name: '@estateaid/events',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
