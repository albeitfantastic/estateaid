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

import {
  configureRevenueCatIfNeeded,
  fetchCustomerInfoSafe,
  isEntitlementActiveInCustomerInfo,
  isRevenueCatConfigured,
  logInRevenueCatUser,
  logOutRevenueCatUser,
  presentManageSubscriptions,
  Purchases,
} from '@/lib/revenuecat-client';
import { PRIMARY_ENTITLEMENT_ID } from '@/lib/subscription-config';
import { fetchSubscriptionEntitlements, rowGrantsAccess } from '@/lib/subscription-access';
import { useAuthStore } from '@/store/auth-store';
import type { SubscriptionEntitlementRow } from '@/types/subscription';

export type SubscriptionContextValue = {
  loading: boolean;
  /** Trusted mirror from Supabase (webhook). Use for gating paid backend-backed features. */
  isPro: boolean;
  /**
   * SDK-reported active entitlement (Apple/Google). Can be true briefly before webhook sync — do not use as sole gate.
   */
  sdkMaisonProActive: boolean;
  entitlementIds: string[];
  expiresAt: string | null;
  managementUrl: string | null;
  primaryRow: SubscriptionEntitlementRow | null;
  error: string | null;
  refetch: () => Promise<void>;
  /** Sync with store + refresh CustomerInfo + refetch Supabase mirror. */
  syncPurchasesAndRefetch: () => Promise<void>;
  presentManageSubscriptions: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const currentUserId = useAuthStore((s) => s.currentUser?.id ?? null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SubscriptionEntitlementRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sdkMaisonProActive, setSdkMaisonProActive] = useState(false);

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
      await fetchCustomerInfoSafe();
    }
    await refetch();
  }, [refetch]);

  useEffect(() => {
    let cancelled = false;
    let listenerAttached = false;

    const listener = (info: CustomerInfo) => {
      if (cancelled) return;
      setSdkMaisonProActive(isEntitlementActiveInCustomerInfo(info, PRIMARY_ENTITLEMENT_ID));
    };

    async function run() {
      if (Platform.OS === 'web') {
        setSdkMaisonProActive(false);
        await refetch();
        return;
      }

      await configureRevenueCatIfNeeded();
      if (cancelled) return;

      Purchases.addCustomerInfoUpdateListener(listener);
      listenerAttached = true;

      if (!currentUserId) {
        await logOutRevenueCatUser();
        setSdkMaisonProActive(false);
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
          setSdkMaisonProActive(false);
        }
      } else {
        setSdkMaisonProActive(false);
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

  const primaryRow = useMemo(
    () => rows.find((r) => r.entitlement_id === PRIMARY_ENTITLEMENT_ID) ?? null,
    [rows]
  );

  const isPro = useMemo(() => {
    if (!primaryRow) return false;
    return rowGrantsAccess(primaryRow);
  }, [primaryRow]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      loading,
      isPro,
      sdkMaisonProActive,
      entitlementIds: rows.map((r) => r.entitlement_id),
      expiresAt: primaryRow?.expires_at ?? null,
      managementUrl: null,
      primaryRow,
      error,
      refetch,
      syncPurchasesAndRefetch,
      presentManageSubscriptions: () => presentManageSubscriptions(),
    }),
    [loading, isPro, sdkMaisonProActive, rows, primaryRow, error, refetch, syncPurchasesAndRefetch]
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
