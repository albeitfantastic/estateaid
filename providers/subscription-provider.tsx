import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import type { CustomerInfo } from 'react-native-purchases';

import { deriveSlotCount } from '@/lib/access-tier-core';
import {
  configureRevenueCatIfNeeded,
  fetchCustomerInfoSafe,
  isRevenueCatConfigured,
  logInRevenueCatUser,
  logOutRevenueCatUser,
  presentManageSubscriptions,
  sdkMaxSlotCount,
  Purchases,
} from '@/lib/revenuecat-client';
import { storeTrialEndsAtFromCustomerInfo } from '@/lib/revenuecat-purchase';
import { fetchSubscriptionEntitlements, rowGrantsAccess } from '@/lib/subscription-access';
import { useAuthStore } from '@/store/auth-store';
import type { SubscriptionEntitlementRow } from '@/types/subscription';

export type SubscriptionContextValue = {
  loading: boolean;
  /** Resolved property slot count (RC + trial + grandfather). */
  slotCount: number;
  /** @deprecated Prefer slotCount > 0 */
  isPro: boolean;
  /** @deprecated Prefer slotCount */
  sdkMaisonProActive: boolean;
  entitlementIds: string[];
  expiresAt: string | null;
  /** ISO end of an active store intro/trial period, if any. */
  storeTrialEndsAt: string | null;
  managementUrl: string | null;
  primaryRow: SubscriptionEntitlementRow | null;
  error: string | null;
  refetch: () => Promise<void>;
  syncPurchasesAndRefetch: () => Promise<void>;
  presentManageSubscriptions: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentUserId = currentUser?.id ?? null;
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SubscriptionEntitlementRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sdkSlotCount, setSdkSlotCount] = useState(0);
  const [storeTrialEndsAt, setStoreTrialEndsAt] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!currentUserId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: e } = await fetchSubscriptionEntitlements();
    if (e) {
      setError(e);
    } else {
      setError(null);
      setRows(data ?? []);
    }
    setLoading(false);
  }, [currentUserId]);

  const syncPurchasesAndRefetch = useCallback(async () => {
    if (Platform.OS !== 'web' && isRevenueCatConfigured()) {
      const info = await fetchCustomerInfoSafe();
      if (info) {
        setSdkSlotCount(sdkMaxSlotCount(info));
        setStoreTrialEndsAt(storeTrialEndsAtFromCustomerInfo(info));
      }
    }
    await refetch();
  }, [refetch]);

  useEffect(() => {
    let cancelled = false;
    let listenerAttached = false;

    const listener = (info: CustomerInfo) => {
      if (cancelled) return;
      setSdkSlotCount(sdkMaxSlotCount(info));
      setStoreTrialEndsAt(storeTrialEndsAtFromCustomerInfo(info));
    };

    async function run() {
      if (Platform.OS === 'web') {
        setSdkSlotCount(0);
        setStoreTrialEndsAt(null);
        await refetch();
        return;
      }

      await configureRevenueCatIfNeeded();
      if (cancelled) return;

      Purchases.addCustomerInfoUpdateListener(listener);
      listenerAttached = true;

      if (!currentUserId) {
        await logOutRevenueCatUser();
        setSdkSlotCount(0);
        setStoreTrialEndsAt(null);
        setRows([]);
        setError(null);
        setLoading(false);
        return;
      }

      if (isRevenueCatConfigured()) {
        try {
          await logInRevenueCatUser(currentUserId);
          const info = await Purchases.getCustomerInfo();
          listener(info);
        } catch {
          setSdkSlotCount(0);
          setStoreTrialEndsAt(null);
        }
      } else {
        setSdkSlotCount(0);
        setStoreTrialEndsAt(null);
      }

      await refetch();
    }

    void run();

    return () => {
      cancelled = true;
      if (listenerAttached) {
        Purchases.removeCustomerInfoUpdateListener(listener);
      }
    };
  }, [currentUserId, refetch]);

  useEffect(() => {
    const onChange = (s: AppStateStatus) => {
      if (s === 'active' && currentUserId) void refetch();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [currentUserId, refetch]);

  const primaryRow = useMemo(() => {
    let best: SubscriptionEntitlementRow | null = null;
    let bestSlots = 0;
    for (const r of rows) {
      if (!rowGrantsAccess(r)) continue;
      const ids = slotEntitlementIds();
      if (!ids.includes(r.entitlement_id) && !rowGrantsAccess(r)) continue;
      const fromDerive = deriveSlotCount({ rows: [r], trialEndsAt: null });
      if (fromDerive >= bestSlots) {
        bestSlots = fromDerive;
        best = r;
      }
    }
    return best;
  }, [rows]);

  const slotCount = useMemo(
    () =>
      deriveSlotCount({
        rows,
        trialEndsAt: currentUser?.trialEndsAt,
        grandfatheredSlots: currentUser?.grandfatheredSlots,
        sdkSlotCount,
      }),
    [rows, currentUser?.trialEndsAt, currentUser?.grandfatheredSlots, sdkSlotCount]
  );

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      loading,
      slotCount,
      isPro: slotCount > 0,
      sdkMaisonProActive: sdkSlotCount > 0,
      entitlementIds: rows.map((r) => r.entitlement_id),
      expiresAt: primaryRow?.expires_at ?? null,
      storeTrialEndsAt,
      managementUrl: null,
      primaryRow,
      error,
      refetch,
      syncPurchasesAndRefetch,
      presentManageSubscriptions: () => presentManageSubscriptions(),
    }),
    [loading, slotCount, sdkSlotCount, storeTrialEndsAt, rows, primaryRow, error, refetch, syncPurchasesAndRefetch]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return ctx;
}

export function useSubscriptionOptional(): SubscriptionContextValue | null {
  return useContext(SubscriptionContext);
}
