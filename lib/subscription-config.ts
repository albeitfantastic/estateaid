/**
 * Client-safe subscription / slot configuration (public env + non-secret identifiers).
 * Slot packs replace boolean Maison Pro (§2 of docs/spec.md).
 */

import { Platform } from 'react-native';

/** @deprecated Display — prefer pack names. */
export const MAISON_PRO_DISPLAY_NAME = 'Maison';

export type SlotPackId = 'residence' | 'domaine' | 'heritage';
export type BillingCycle = 'annual' | 'monthly';

export const DEFAULT_SLOT_PACK_ID: SlotPackId = 'domaine';
export const SLOT_PACK_ORDER: SlotPackId[] = ['residence', 'domaine', 'heritage'];

export const SLOT_PACKS: Record<
  SlotPackId,
  {
    entitlementId: string;
    slots: number;
    displayName: string;
    annualEur: number;
    monthlyEur: number;
    perPropertyYearEur: number;
    perPropertyMonthEur: number;
    productIds: { annual: string; monthly: string };
  }
> = {
  residence: {
    entitlementId: 'Maison Home',
    slots: 1,
    displayName: 'Résidence',
    annualEur: 149.99,
    monthlyEur: 14.99,
    perPropertyYearEur: 150,
    perPropertyMonthEur: 15,
    productIds: { annual: 'residence_annual', monthly: 'residence_monthly' },
  },
  domaine: {
    entitlementId: 'Maison Family',
    slots: 3,
    displayName: 'Domaine',
    annualEur: 299.99,
    monthlyEur: 29.99,
    perPropertyYearEur: 100,
    perPropertyMonthEur: 10,
    productIds: { annual: 'domaine_annual', monthly: 'domaine_monthly' },
  },
  heritage: {
    entitlementId: 'Maison Portfolio',
    slots: 7,
    displayName: 'Héritage',
    annualEur: 499.99,
    monthlyEur: 49.99,
    perPropertyYearEur: 71,
    perPropertyMonthEur: 7,
    productIds: { annual: 'heritage_annual', monthly: 'heritage_monthly' },
  },
};

/**
 * Entitlement id → slot count.
 * Lookup keys stay Maison Home / Family / Portfolio (RC cannot rename them).
 * Legacy boolean Pro maps to 1.
 */
export const ENTITLEMENT_SLOT_MAP: Record<string, number> = {
  'Maison Home': 1,
  maison_home: 1,
  'Maison Résidence': 1,
  'Maison Residence': 1,
  'Maison Family': 3,
  maison_family: 3,
  'Maison Domaine': 3,
  'Maison Portfolio': 7,
  maison_portfolio: 7,
  'Maison Héritage': 7,
  'Maison Heritage': 7,
  'Maison Pro': 1,
  maison_pro: 1,
};

/** Store product id → slot count. Source of truth for “which pack is active”. */
export const PRODUCT_SLOT_MAP: Record<string, number> = {
  residence_annual: 1,
  residence_monthly: 1,
  home_annual: 1,
  home_monthly: 1,
  domaine_annual: 3,
  domaine_monthly: 3,
  family_annual: 3,
  family_monthly: 3,
  heritage_annual: 7,
  heritage_monthly: 7,
  portfolio_annual: 7,
  portfolio_monthly: 7,
};

export function slotsForEntitlementId(id: string): number {
  return ENTITLEMENT_SLOT_MAP[id] ?? 0;
}

export function slotsForProductId(id: string | null | undefined): number {
  if (!id) return 0;
  return PRODUCT_SLOT_MAP[id] ?? 0;
}

/** Offering package lookup_key for a pack + billing cycle (matches RevenueCat catalog). */
export function packageLookupKey(packId: SlotPackId, billing: BillingCycle): string {
  return SLOT_PACKS[packId].productIds[billing];
}

/** Legal disclosure for the selected pack. Intro-eligible vs already used. */
export function storeOfferDisclosure(
  packId: SlotPackId,
  billing: BillingCycle,
  introEligible: boolean
): string {
  const pack = SLOT_PACKS[packId];
  const price = billing === 'annual' ? pack.annualEur : pack.monthlyEur;
  const period = billing === 'annual' ? 'year' : 'month';
  const billed = billing === 'annual' ? 'billed annually' : 'billed monthly';
  const then = `Then €${price.toFixed(2)}/${period} (${pack.displayName}), ${billed}, renews automatically until you cancel. Cancel anytime in your Apple ID or Google Play subscriptions.`;
  if (introEligible) {
    return `${STORE_TRIAL_DAYS}-day free trial. ${then} You will not be charged during the trial.`;
  }
  return then;
}

export function perPropertyPitch(
  pack: (typeof SLOT_PACKS)[SlotPackId],
  billing: BillingCycle
): { amount: number; unit: 'year' | 'month' } {
  if (billing === 'annual') {
    return { amount: pack.perPropertyYearEur, unit: 'year' };
  }
  return { amount: pack.perPropertyMonthEur, unit: 'month' };
}

/** @deprecated Use perPropertyPitch — this always returned a yearly figure. */
export function perPropertyYearEur(
  pack: (typeof SLOT_PACKS)[SlotPackId],
  billing: BillingCycle
): number {
  return perPropertyPitch(pack, billing).amount;
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
  'Maison Résidence',
  'Maison Residence',
  'Maison Domaine',
  'Maison Héritage',
  'Maison Heritage',
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
  monthly: SLOT_PACKS.domaine.productIds.monthly,
  yearly: SLOT_PACKS.domaine.productIds.annual,
} as const;

export const EXIT_OFFERING_ID =
  process.env.EXPO_PUBLIC_RC_EXIT_OFFERING_ID?.trim() || 'exit_offer';

/** Store intro / app trial length (days). Copy and ASC intro offers must say 14. */
export const STORE_TRIAL_DAYS = 14;
export const APP_TRIAL_DAYS = 14;

/** Slots granted during a leftover app-managed trial only. Store intros use the purchased SKU. */
export const TRIAL_SLOT_COUNT = SLOT_PACKS.domaine.slots;

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
