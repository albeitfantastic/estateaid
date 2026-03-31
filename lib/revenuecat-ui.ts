import { Platform } from 'react-native';
import RevenueCatUI, {
  type CustomerCenterCallbacks,
  type PAYWALL_RESULT,
} from 'react-native-purchases-ui';

import { isRevenueCatConfigured } from '@/lib/revenuecat-client';

export function isRevenueCatUiAvailable(): boolean {
  return (Platform.OS === 'ios' || Platform.OS === 'android') && isRevenueCatConfigured();
}

/** Modal paywall (current offering from RevenueCat dashboard). */
export async function presentRevenueCatPaywallModal(): Promise<PAYWALL_RESULT | null> {
  if (!isRevenueCatUiAvailable()) return null;
  try {
    return await RevenueCatUI.presentPaywall({ displayCloseButton: true });
  } catch {
    return null;
  }
}

/** Presents paywall only if the entitlement is not already active (SDK-side check). */
export async function presentPaywallIfNeededForEntitlement(
  entitlementId: string
): Promise<PAYWALL_RESULT | null> {
  if (!isRevenueCatUiAvailable()) return null;
  try {
    return await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: entitlementId,
      displayCloseButton: true,
    });
  } catch {
    return null;
  }
}

/** System-modal Customer Center (subscription management UI from RevenueCat). */
export async function presentRevenueCatCustomerCenter(callbacks?: CustomerCenterCallbacks) {
  if (!isRevenueCatUiAvailable()) return;
  try {
    await RevenueCatUI.presentCustomerCenter({ callbacks });
  } catch {
    /* User may dismiss or native module unavailable */
  }
}

export { RevenueCatUI };
