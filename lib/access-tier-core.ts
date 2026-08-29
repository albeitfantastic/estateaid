export type AccessTier = 'trial' | 'pro' | 'standard';

/**
 * Pro (paid mirror), active store entitlement (SDK), or active app trial => full host capabilities.
 */
export function deriveAccessTier(input: {
  trialEndsAt?: string | null;
  isProEntitlement: boolean;
  sdkEntitlementActive?: boolean;
}): AccessTier {
  const end = input.trialEndsAt?.trim();
  if (end && new Date(end).getTime() > Date.now()) {
    return 'trial';
  }
  if (input.isProEntitlement) {
    return 'pro';
  }
  if (input.sdkEntitlementActive) {
    return 'pro';
  }
  return 'standard';
}
