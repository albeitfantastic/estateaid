import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/types';

export type OwnerTier = 'starter' | 'premium';
export type ThemePreference = 'light' | 'dark';

interface AuthState {
  currentUser: User | null;
  isHydrated: boolean;
  hasCompletedOnboarding: boolean;
  selectedTier: OwnerTier | null;
  pendingInviteCode: string | null;
  themePreference: ThemePreference;
  setUser: (user: User) => void;
  clearUser: () => void;
  setHydrated: () => void;
  completeOnboarding: (tier?: OwnerTier) => void;
  setPendingInviteCode: (code: string | null) => void;
  setThemePreference: (theme: ThemePreference) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      isHydrated: false,
      hasCompletedOnboarding: false,
      selectedTier: null,
      pendingInviteCode: null,
      themePreference: 'light',
      setUser: (user) => set({ currentUser: user }),
      clearUser: () => set({ currentUser: null }),
      setHydrated: () => set({ isHydrated: true }),
      completeOnboarding: (tier) =>
        set({ hasCompletedOnboarding: true, ...(tier ? { selectedTier: tier } : {}) }),
      setPendingInviteCode: (code) => set({ pendingInviteCode: code }),
      setThemePreference: (theme) => set({ themePreference: theme }),
    }),
    {
      name: '@estateaid/auth/v5',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
