import { supabase } from '@/lib/supabase';
import { User } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark';

/** Onboarding flag is scoped to this user id so a new account on the same device is not skipped. */
export function isOnboardingCompleteForCurrentUser(s: {
  currentUser: User | null;
  hasCompletedOnboarding: boolean;
  onboardingCompletedForUserId: string | null;
}): boolean {
  const id = s.currentUser?.id;
  if (!id) return false;
  return s.hasCompletedOnboarding && s.onboardingCompletedForUserId === id;
}

/** Returning accounts (trial/quiz on the profile) skip the quiz even if the device flag was lost. */
export function accountHasCompletedOnboarding(
  s: {
    currentUser: User | null;
    hasCompletedOnboarding: boolean;
    onboardingCompletedForUserId: string | null;
  },
  extras?: { hasQuiz?: boolean; hasUseCase?: boolean }
): boolean {
  if (isOnboardingCompleteForCurrentUser(s)) return true;
  const u = s.currentUser;
  if (!u) return false;
  if (u.trialStartedAt || u.hasUsedTrial) return true;
  if (extras?.hasQuiz || extras?.hasUseCase) return true;
  return false;
}

function profileToUser(
  profile: Record<string, unknown>,
  email: string
): User {
  return {
    id: profile.id as string,
    name: profile.name as string,
    email,
    avatarUrl: (profile.avatar_url as string | null) ?? undefined,
    createdAt: (profile.created_at ?? '') as string,
    trialEndsAt: (profile.trial_ends_at as string | null) ?? null,
    trialStartedAt: (profile.trial_started_at as string | null) ?? null,
    hasUsedTrial: Boolean(profile.has_used_trial),
    grandfatheredSlots: (profile.grandfathered_slots as number | null) ?? null,
  };
}

interface AuthState {
  currentUser: User | null;
  isHydrated: boolean;
  hasCompletedOnboarding: boolean;
  /** User id for which `hasCompletedOnboarding` applies; must match `currentUser.id` to skip onboarding. */
  onboardingCompletedForUserId: string | null;
  pendingInviteCode: string | null;
  /** Deep-linked invitees skip quiz + start fork. */
  skipOnboardingForInvite: boolean;
  themePreference: ThemePreference;
  /** Persisted; when false, skip push registration and clear server token. */
  notificationsEnabled: boolean;
  setUser: (user: User) => void;
  patchUser: (
    partial: Partial<
      Pick<User, 'name' | 'avatarUrl' | 'trialEndsAt' | 'trialStartedAt' | 'hasUsedTrial' | 'grandfatheredSlots'>
    >
  ) => void;
  clearUser: () => void;
  setHydrated: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  setPendingInviteCode: (code: string | null) => void;
  setSkipOnboardingForInvite: (skip: boolean) => void;
  setThemePreference: (theme: ThemePreference) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  bootstrapSession: () => Promise<void>;
  refreshProfileFromSupabase: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isHydrated: false,
      hasCompletedOnboarding: false,
      onboardingCompletedForUserId: null,
      pendingInviteCode: null,
      skipOnboardingForInvite: false,
      themePreference: 'light',
      notificationsEnabled: false,
      setUser: (user) => set({ currentUser: user }),
      patchUser: (partial) =>
        set((s) => {
          if (!s.currentUser) return {};
          return { currentUser: { ...s.currentUser, ...partial } };
        }),
      clearUser: () => set({ currentUser: null }),
      setHydrated: () => set({ isHydrated: true }),
      completeOnboarding: () =>
        set((s) => ({
          hasCompletedOnboarding: true,
          onboardingCompletedForUserId: s.currentUser?.id ?? s.onboardingCompletedForUserId,
        })),
      resetOnboarding: () => set({ hasCompletedOnboarding: false, onboardingCompletedForUserId: null }),
      setPendingInviteCode: (code) => set({ pendingInviteCode: code }),
      setSkipOnboardingForInvite: (skip) => set({ skipOnboardingForInvite: skip }),
      setThemePreference: (theme) => set({ themePreference: theme }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      bootstrapSession: async () => {
        const BOOTSTRAP_MS = 4000;
        try {
          await Promise.race([
            (async () => {
              const {
                data: { session },
              } = await supabase.auth.getSession();
              if (session?.user) {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('id, name, avatar_url, created_at, trial_started_at, trial_ends_at, has_used_trial, grandfathered_slots')
                  .eq('id', session.user.id)
                  .single();
                if (profile) {
                  set({
                    currentUser: profileToUser(profile as Record<string, unknown>, session.user.email!),
                  });
                }
              }
            })(),
            new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('bootstrap_timeout')), BOOTSTRAP_MS);
            }),
          ]);
        } catch {
          // session check failed / timed out — leave currentUser as null
        } finally {
          set({ isHydrated: true });
        }
      },
      refreshProfileFromSupabase: async () => {
        const uid = get().currentUser?.id;
        if (!uid) return;
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, name, avatar_url, created_at, trial_started_at, trial_ends_at, has_used_trial, grandfathered_slots')
            .eq('id', uid)
            .single();
          if (profile) {
            const email = get().currentUser?.email;
            if (email) {
              set({ currentUser: profileToUser(profile as Record<string, unknown>, email) });
            }
          }
        } catch {
          /* ignore */
        }
      },
      signOut: async () => {
        await supabase.auth.signOut();
        set({ currentUser: null });
      },
    }),
    {
      name: '@estateaid/auth/v11',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        onboardingCompletedForUserId: state.onboardingCompletedForUserId,
        pendingInviteCode: state.pendingInviteCode,
        skipOnboardingForInvite: state.skipOnboardingForInvite,
        themePreference: state.themePreference,
        notificationsEnabled: state.notificationsEnabled,
      }),
    }
  )
);
