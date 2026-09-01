/**
 * Client-safe subscription / slot configuration (public env + non-secret identifiers).
 * Slot packs replace boolean Maison Pro (§2 of docs/spec.md).
 */

import { Platform } from 'react-native';

/** @deprecated Display — prefer pack names. */
export const MAISON_PRO_DISPLAY_NAME = 'Maison';

export type SlotPackId = 'home' | 'family' | 'portfolio';

export const SLOT_PACKS: Record<
  SlotPackId,
  {
    entitlementId: string;
    slots: number;
    displayName: string;
    annualEur: number;
    monthlyEur: number;
    perPropertyYearEur: number;
    productIds: { annual: string; monthly: string };
  }
> = {
  home: {
    entitlementId: 'Maison Home',
    slots: 1,
    displayName: 'Home',
    annualEur: 59.99,
    monthlyEur: 6.99,
    perPropertyYearEur: 60,
    productIds: { annual: 'home_annual', monthly: 'home_monthly' },
  },
  family: {
    entitlementId: 'Maison Family',
    slots: 3,
    displayName: 'Family',
    annualEur: 99.99,
    monthlyEur: 10.99,
    perPropertyYearEur: 33,
    productIds: { annual: 'family_annual', monthly: 'family_monthly' },
  },
  portfolio: {
    entitlementId: 'Maison Portfolio',
    slots: 10,
    displayName: 'Portfolio',
    annualEur: 199.99,
    monthlyEur: 19.99,
    perPropertyYearEur: 20,
    productIds: { annual: 'portfolio_annual', monthly: 'portfolio_monthly' },
  },
};

/** Entitlement id → slot count (includes legacy Pro). */
export const ENTITLEMENT_SLOT_MAP: Record<string, number> = {
  'Maison Home': 1,
  maison_home: 1,
  'Maison Family': 3,
  maison_family: 3,
  'Maison Portfolio': 10,
  maison_portfolio: 10,
  'Maison Pro': 1,
  maison_pro: 1,
};

export function slotsForEntitlementId(id: string): number {
  return ENTITLEMENT_SLOT_MAP[id] ?? 0;
}

/** All entitlement ids that grant slots. */
export function slotEntitlementIds(): string[] {
  return Object.keys(ENTITLEMENT_SLOT_MAP);
}

/** @deprecated Prefer slotEntitlementIds / pack entitlements. */
export const PRIMARY_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_RC_ENTITLEMENT_ID?.trim() || 'Maison Family';

export const PRIMARY_ENTITLEMENT_ID_ALIASES = [
  'Maison Home',
  'Maison Family',
  'Maison Portfolio',
  'Maison Pro',
  'maison_pro',
] as const;

export function entitlementIdsToMatch(): string[] {
  return [...new Set<string>([PRIMARY_ENTITLEMENT_ID, ...PRIMARY_ENTITLEMENT_ID_ALIASES, ...slotEntitlementIds()])];
}

export function isPrimaryEntitlementId(id: string): boolean {
  return slotsForEntitlementId(id) > 0 || entitlementIdsToMatch().includes(id);
}

/** @deprecated Use SLOT_PACKS productIds. Kept for older soft-pitch paths. */
export const RC_PRODUCT_IDS = {
  monthly: 'family_monthly',
  yearly: 'family_annual',
} as const;

export const EXIT_OFFERING_ID =
  process.env.EXPO_PUBLIC_RC_EXIT_OFFERING_ID?.trim() || 'exit_offer';

/** App-managed trial length (days). Store intro offers may differ; copy must say 14. */
export const STORE_TRIAL_DAYS = 14;
export const APP_TRIAL_DAYS = 14;

/** Slots granted during an active app trial. Family pack (3) so testers can add three properties. */
export const TRIAL_SLOT_COUNT = SLOT_PACKS.family.slots;

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
