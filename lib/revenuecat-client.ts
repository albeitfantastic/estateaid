import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type CustomerInfo } from 'react-native-purchases';

import { getRevenueCatApiKey, entitlementIdsToMatch } from '@/lib/subscription-config';

let configured = false;

function supportedNative(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/**
 * One-time SDK setup with public API key only. Call after app shell is ready.
 * Identity: use logInWithUserId after Supabase session exists (never email).
 */
export async function configureRevenueCatIfNeeded(): Promise<void> {
  if (!supportedNative()) return;
  const key = getRevenueCatApiKey();
  if (!key) {
    if (__DEV__) {
      console.warn('[RevenueCat] Missing EXPO_PUBLIC_REVENUECAT_*_API_KEY');
    }
    return;
  }
  if (configured) return;
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: key });
  configured = true;
}

/** Bind RevenueCat app user id to Supabase auth user id (UUID). */
export async function logInRevenueCatUser(userId: string): Promise<void> {
  if (!supportedNative() || !configured || !getRevenueCatApiKey()) return;
  const { customerInfo } = await Purchases.logIn(userId);
  void customerInfo;
}

/** Clear linkage on sign-out (may briefly yield anonymous device user — unavoidable per SDK). */
export async function logOutRevenueCatUser(): Promise<void> {
  if (!supportedNative() || !configured || !getRevenueCatApiKey()) return;
  try {
    if (await Purchases.isAnonymous()) return;
    await Purchases.logOut();
  } catch {
    /* idempotent / already logged out */
  }
}

export function isRevenueCatConfigured(): boolean {
  return supportedNative() && configured && !!getRevenueCatApiKey();
}

/** Native store subscription management (no URL stored; system UI). */
export async function presentManageSubscriptions(): Promise<void> {
  if (!isRevenueCatConfigured()) return;
  await Purchases.showManageSubscriptions();
}

/** SDK-side entitlement check (UX / diagnostics only; server mirror remains authoritative). */
export function isEntitlementActiveInCustomerInfo(
  info: CustomerInfo,
  entitlementId: string
): boolean {
  if (info.entitlements.active[entitlementId] != null) return true;
  // Also accept configured aliases when checking the primary Maison Pro entitlement.
  return entitlementIdsToMatch().some(
    (id) => id !== entitlementId && info.entitlements.active[id] != null
  );
}

/** Refresh with Apple/Google then return latest CustomerInfo, or null on failure. */
export async function fetchCustomerInfoSafe(): Promise<CustomerInfo | null> {
  if (!isRevenueCatConfigured()) return null;
  try {
    await Purchases.syncPurchases();
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export { Purchases };
