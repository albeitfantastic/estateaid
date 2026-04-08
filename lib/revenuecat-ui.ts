import { NativeModules, Platform, UIManager } from 'react-native';
import RevenueCatUI, {
  type CustomerCenterCallbacks,
  type PAYWALL_RESULT,
} from 'react-native-purchases-ui';

import { isRevenueCatConfigured } from '@/lib/revenuecat-client';

/**
 * True when `<RevenueCatUI.Paywall />` would use the native view, not RC preview
 * ("Web paywalls are not supported yet." in Expo Go / web / missing native module).
 */
export function isEmbeddedRevenueCatPaywallAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  if (!isRevenueCatConfigured()) return false;
  if (NativeModules.RNPaywalls == null) return false;
  if (UIManager.getViewManagerConfig('Paywall') == null) return false;
  return true;
}

/** Same for embedded Customer Center (avoids preview stub). */
export function isEmbeddedRevenueCatCustomerCenterAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  if (!isRevenueCatConfigured()) return false;
  if (NativeModules.RNCustomerCenter == null) return false;
  if (UIManager.getViewManagerConfig('CustomerCenterView') == null) return false;
  return true;
}

/** Modal paywall / customer center: only when native RC UI modules exist. */
export function isRevenueCatUiAvailable(): boolean {
  return isEmbeddedRevenueCatPaywallAvailable();
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
  if (!isEmbeddedRevenueCatCustomerCenterAvailable()) return;
  try {
    await RevenueCatUI.presentCustomerCenter({ callbacks });
  } catch {
    /* User may dismiss or native module unavailable */
  }
}

export { RevenueCatUI };
