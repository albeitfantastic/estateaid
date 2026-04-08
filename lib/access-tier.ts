import { useAuthStore } from '@/store/auth-store';
import { useSubscription } from '@/providers/subscription-provider';

export type AccessTier = 'trial' | 'pro' | 'standard';

/**
 * Pro (paid mirror) or active app trial => full host capabilities.
 * Standard => guest-like surface; owned estates may be shown locked in UI.
 */
export function deriveAccessTier(input: {
  trialEndsAt?: string | null;
  isProEntitlement: boolean;
}): AccessTier {
  const end = input.trialEndsAt?.trim();
  if (end && new Date(end).getTime() > Date.now()) {
    return 'trial';
  }
  if (input.isProEntitlement) {
    return 'pro';
  }
  return 'standard';
}

export function useAccessTier(): AccessTier {
  const trialEndsAt = useAuthStore((s) => s.currentUser?.trialEndsAt);
  const { isPro } = useSubscription();
  return deriveAccessTier({ trialEndsAt, isProEntitlement: isPro });
}

export function useHasFullHostAccess(): boolean {
  return useAccessTier() !== 'standard';
}
