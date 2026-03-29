import { User } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

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
  bootstrapSession: () => Promise<void>;
  signOut: () => Promise<void>;
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
      bootstrapSession: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            if (profile) {
              set({
                currentUser: {
                  id: profile.id,
                  name: profile.name,
                  email: session.user.email!,
                  avatarUrl: profile.avatar_url ?? undefined,
                  role: profile.role,
                  createdAt: profile.created_at,
                },
              });
            }
          }
        } catch {
          // session check failed — leave currentUser as null
        } finally {
          set({ isHydrated: true });
        }
      },
      signOut: async () => {
        await supabase.auth.signOut();
        set({ currentUser: null });
      },
    }),
    {
      name: '@estateaid/auth/v9',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        selectedTier: state.selectedTier,
        pendingInviteCode: state.pendingInviteCode,
        themePreference: state.themePreference,
      }),
    }
  )
);
