import {
  INTRO_ELIGIBILITY_STATUS,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

import { Purchases, isRevenueCatConfigured } from '@/lib/revenuecat-client';
import { packageLookupKey, type BillingCycle, type SlotPackId } from '@/lib/subscription-config';

export type PurchaseOutcome =
  | { kind: 'purchased' }
  | { kind: 'cancelled' }
  | { kind: 'failed'; message: string };

export async function findOfferingPackage(
  packId: SlotPackId,
  billing: BillingCycle
): Promise<PurchasesPackage | null> {
  if (!isRevenueCatConfigured()) return null;
  const key = packageLookupKey(packId, billing);
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return null;
    const match =
      current.availablePackages.find((p) => p.identifier === key) ??
      current.availablePackages.find((p) => p.product.identifier === key) ??
      null;
    if (match) return match;
    if (packId === 'domaine' && billing === 'annual') {
      return current.annual ?? current.availablePackages.find((p) => p.identifier === '$rc_annual') ?? null;
    }
    if (packId === 'domaine' && billing === 'monthly') {
      return current.monthly ?? current.availablePackages.find((p) => p.identifier === '$rc_monthly') ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function isIntroEligibleForProduct(productId: string): Promise<boolean> {
  if (!isRevenueCatConfigured()) return true;
  try {
    const map = await Purchases.checkTrialOrIntroductoryPriceEligibility([productId]);
    const status = map[productId]?.status;
    if (
      status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE ||
      status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS
    ) {
      return false;
    }
    // ELIGIBLE, or UNKNOWN (Android always returns unknown; SKUs are configured with a 14-day intro).
    return true;
  } catch {
    return true;
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<PurchaseOutcome> {
  try {
    await Purchases.purchasePackage(pkg);
    return { kind: 'purchased' };
  } catch (e: unknown) {
    const err = e as { userCancelled?: boolean; message?: string };
    if (err?.userCancelled === true) return { kind: 'cancelled' };
    return { kind: 'failed', message: err?.message ?? 'Purchase failed.' };
  }
}

export async function restorePurchases(): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await Purchases.restorePurchases();
    return { ok: true };
  } catch (e: unknown) {
    const err = e as { message?: string };
    return { ok: false, message: err?.message ?? 'Restore failed.' };
  }
}

/** Expiration of an active store intro/trial period, if any. */
export function storeTrialEndsAtFromCustomerInfo(info: CustomerInfo): string | null {
  let latest: string | null = null;
  let latestMs = 0;
  for (const ent of Object.values(info.entitlements.active)) {
    const period = String(ent.periodType ?? '').toLowerCase();
    if (period !== 'trial' && period !== 'intro') continue;
    const exp = ent.expirationDate;
    if (!exp) continue;
    const ms = new Date(exp).getTime();
    if (Number.isFinite(ms) && ms > latestMs) {
      latestMs = ms;
      latest = exp;
    }
  }
  return latest;
}
