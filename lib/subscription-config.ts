import { Platform } from 'react-native';

/**
 * Client-safe subscription configuration (public env + non-secret identifiers).
 * Must match RevenueCat dashboard: entitlement + store product identifiers.
 */

/** Display name for UI copy (dashboard entitlement can still be `maison_pro`). */
export const MAISON_PRO_DISPLAY_NAME = 'Maison Pro';

/**
 * RevenueCat entitlement identifier for Maison Pro.
 * Create this entitlement in RevenueCat and attach products `monthly` / `yearly`.
 */
export const PRIMARY_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_RC_ENTITLEMENT_ID?.trim() || 'maison_pro';

/** Store product ids — configure the same identifiers in App Store Connect / Play Console + RevenueCat. */
export const RC_PRODUCT_IDS = {
  monthly: 'monthly',
  yearly: 'yearly',
} as const;

/**
 * Public SDK key resolution:
 * 1) EXPO_PUBLIC_REVENUECAT_API_KEY — single key (e.g. RevenueCat Test Store / unified test key)
 * 2) Platform-specific EXPO_PUBLIC_REVENUECAT_IOS_API_KEY / ANDROID
 */
export function getRevenueCatApiKey(): string | null {
  const universal = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY?.trim();
  if (universal) return universal;

  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() ?? null;
  }
  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() ?? null;
  }
  return null;
}
