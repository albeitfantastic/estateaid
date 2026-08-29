import { Platform } from 'react-native';

/**
 * Client-safe subscription configuration (public env + non-secret identifiers).
 * Must match RevenueCat dashboard: entitlement + store product identifiers.
 */

/** Display name for UI copy. */
export const MAISON_PRO_DISPLAY_NAME = 'Maison Pro';

/**
 * RevenueCat entitlement identifier for Maison Pro.
 * Must match the Identifier in the RC dashboard (currently "Maison Pro", not maison_pro).
 */
export const PRIMARY_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_RC_ENTITLEMENT_ID?.trim() || 'Maison Pro';

/** Accept legacy `maison_pro` rows/SDK keys as well as the dashboard id. */
export const PRIMARY_ENTITLEMENT_ID_ALIASES = ['Maison Pro', 'maison_pro'] as const;

export function entitlementIdsToMatch(): string[] {
  return [...new Set<string>([PRIMARY_ENTITLEMENT_ID, ...PRIMARY_ENTITLEMENT_ID_ALIASES])];
}

export function isPrimaryEntitlementId(id: string): boolean {
  return entitlementIdsToMatch().includes(id);
}

/** Store product ids — configure the same identifiers in App Store Connect / Play Console + RevenueCat. */
export const RC_PRODUCT_IDS = {
  monthly: 'monthly',
  yearly: 'yearly',
} as const;

/**
 * Optional RevenueCat offering identifier for the exit-offer soft pitch.
 * Create this offering in the RC dashboard with intro pricing / promo; until it exists,
 * the exit “Claim offer” path falls back to the current offering.
 */
export const EXIT_OFFERING_ID =
  process.env.EXPO_PUBLIC_RC_EXIT_OFFERING_ID?.trim() || 'exit_offer';

/** Store free-trial length shown in soft pitch copy — must match App Store / Play / RC. */
export const STORE_TRIAL_DAYS = 7;

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
