import { type AccessTier, deriveAccessTier } from '@/lib/access-tier-core';
import { useAuthStore } from '@/store/auth-store';
import { useSubscription } from '@/providers/subscription-provider';

export type { AccessTier };
export { deriveAccessTier };

export function useAccessTier(): AccessTier {
  const trialEndsAt = useAuthStore((s) => s.currentUser?.trialEndsAt);
  const { isPro, sdkMaisonProActive } = useSubscription();
  return deriveAccessTier({
    trialEndsAt,
    isProEntitlement: isPro,
    sdkEntitlementActive: sdkMaisonProActive,
  });
}

/** @deprecated Prefer useCan() from entitlements/capabilities for feature gates. */
export function useHasFullHostAccess(): boolean {
  return useAccessTier() !== 'standard';
}
