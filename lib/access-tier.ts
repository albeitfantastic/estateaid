import { deriveAccessTier, deriveSlotCount, type AccessTier } from '@/lib/access-tier-core';
import { useAuthStore } from '@/store/auth-store';
import { useSubscription } from '@/providers/subscription-provider';

export type { AccessTier };
export { deriveAccessTier, deriveSlotCount };

/** @deprecated Prefer useAccountContext().slotCount / useCan(). */
export function useAccessTier(): AccessTier {
  const trialEndsAt = useAuthStore((s) => s.currentUser?.trialEndsAt);
  const { slotCount, isPro, sdkMaisonProActive } = useSubscription();
  if (slotCount > 0) {
    return deriveAccessTier({
      trialEndsAt,
      isProEntitlement: isPro || slotCount > 0,
      sdkEntitlementActive: sdkMaisonProActive,
    });
  }
  return deriveAccessTier({
    trialEndsAt,
    isProEntitlement: isPro,
    sdkEntitlementActive: sdkMaisonProActive,
  });
}

/** @deprecated Prefer useCan() / useAccountContext(). */
export function useHasFullHostAccess(): boolean {
  const { slotCount } = useSubscription();
  return slotCount > 0;
}

export function useSlotCount(): number {
  return useSubscription().slotCount;
}
