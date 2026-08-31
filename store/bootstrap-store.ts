import { create } from 'zustand';

type BootstrapState = {
  /** Non-null when at least one store fetch failed. Cached data is left in place. */
  error: string | null;
  retrying: boolean;
  setError: (error: string | null) => void;
  setRetrying: (retrying: boolean) => void;
};

export const useBootstrapStore = create<BootstrapState>((set) => ({
  error: null,
  retrying: false,
  setError: (error) => set({ error }),
  setRetrying: (retrying) => set({ retrying }),
}));
