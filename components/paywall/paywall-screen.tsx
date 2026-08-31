import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { PurchasesOffering } from 'react-native-purchases';

import { GroupedList, ScreenShell, useScreenTheme } from '@/components/ui/screen-layout';
import { Layout } from '@/constants/theme';
import { Purchases, isRevenueCatConfigured, isEntitlementActiveInCustomerInfo } from '@/lib/revenuecat-client';
import {
  EXIT_OFFERING_ID,
  MAISON_PRO_DISPLAY_NAME,
  PRIMARY_ENTITLEMENT_ID,
  RC_PRODUCT_IDS,
  isPrimaryEntitlementId,
} from '@/lib/subscription-config';
import { fetchSubscriptionEntitlements, rowGrantsAccess } from '@/lib/subscription-access';
import { isEmbeddedRevenueCatPaywallAvailable, RevenueCatUI } from '@/lib/revenuecat-ui';
import { useSubscription } from '@/providers/subscription-provider';
import { useAuthStore } from '@/store/auth-store';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface PaywallScreenProps {
  /**
   * Override the default dismiss behaviour (back or home navigation).
   * Used by the paywall flow to intercept dismiss → show the exit offer screen.
   */
  onDismiss?: () => void;
  /** After purchase/restore with active entitlement — prefer home from onboarding. */
  onSuccess?: () => void;
  /** RevenueCat offering identifier (e.g. exit_offer). Falls back to current. */
  offeringIdentifier?: string;
  /** Preferred store product package (monthly / yearly) — reserved for future default package. */
  preferredPlanId?: 'monthly' | 'yearly';
}

/**
 * RevenueCat Paywall framed in Maison acquisition (`MC`) chrome.
 * Products `monthly` / `yearly` should be on the current offering in RevenueCat.
 * Trusted unlock still follows Supabase mirror after webhook; we poll after purchase/restore.
 */
export function PaywallScreen({
  onDismiss,
  onSuccess,
  offeringIdentifier,
  preferredPlanId: _preferredPlanId,
}: PaywallScreenProps = {}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const refreshProfile = useAuthStore((s) => s.refreshProfileFromSupabase);
  const { refetch, syncPurchasesAndRefetch, isPro, loading: subLoading } = useSubscription();
  const plan = MAISON_PRO_DISPLAY_NAME;

  const [confirming, setConfirming] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [offeringReady, setOfferingReady] = useState(false);
  /** RC often fires onDismiss after a successful purchase — ignore so we don't jump to Exit. */
  const suppressDismissRef = useRef(false);

  void _preferredPlanId; // threaded for future package default; RC UI selects via template today

  const leaveOnDismiss = useCallback(() => {
    if (suppressDismissRef.current) return;
    if (onDismiss) {
      onDismiss();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(app)/home' as never);
  }, [onDismiss, router]);

  const leaveOnSuccess = useCallback(() => {
    suppressDismissRef.current = true;
    if (onSuccess) {
      onSuccess();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(app)/home' as never);
  }, [onSuccess, router]);

  useEffect(() => {
    let cancelled = false;
    async function loadOffering() {
      if (!isRevenueCatConfigured()) {
        if (!cancelled) setOfferingReady(true);
        return;
      }
      try {
        const offerings = await Purchases.getOfferings();
        const id = offeringIdentifier?.trim();
        const selected =
          (id ? offerings.all[id] : undefined) ?? offerings.current ?? null;
        if (!cancelled) setOffering(selected);
        if (__DEV__ && id && !offerings.all[id]) {
          console.warn(
            `[Paywall] Offering "${id}" not found; using current. Create "${EXIT_OFFERING_ID}" in RevenueCat for exit promo.`
          );
        }
      } catch {
        if (!cancelled) setOffering(null);
      } finally {
        if (!cancelled) setOfferingReady(true);
      }
    }
    void loadOffering();
    return () => {
      cancelled = true;
    };
  }, [offeringIdentifier]);

  const pollMirrorUntilActive = useCallback(async (maxAttempts = 8) => {
    setConfirming(true);
    try {
      for (let i = 0; i < maxAttempts; i++) {
        await refetch();
        await sleep(1500);
        const { data } = await fetchSubscriptionEntitlements();
        const row = data?.find((r) => isPrimaryEntitlementId(r.entitlement_id));
        if (row && rowGrantsAccess(row)) return true;
      }
    } finally {
      setConfirming(false);
    }
    return false;
  }, [refetch]);

  const onCompletedFlow = useCallback(async () => {
    suppressDismissRef.current = true;
    const ok = await pollMirrorUntilActive();
    await syncPurchasesAndRefetch().catch(() => undefined);
    await refreshProfile().catch(() => undefined);
    let sdkActive = false;
    try {
      if (isRevenueCatConfigured()) {
        const info = await Purchases.getCustomerInfo();
        sdkActive = isEntitlementActiveInCustomerInfo(info, PRIMARY_ENTITLEMENT_ID);
      }
    } catch {
      sdkActive = false;
    }
    if (ok) {
      Alert.alert(t('paywall.welcomeTitle', { plan }), t('paywall.welcomeBody'), [
        { text: t('common.ok'), onPress: () => leaveOnSuccess() },
      ]);
    } else if (sdkActive) {
      Alert.alert(t('paywall.welcomeTitle', { plan }), t('paywall.welcomeBody'), [
        { text: t('common.ok'), onPress: () => leaveOnSuccess() },
      ]);
    } else {
      Alert.alert(t('paywall.processingTitle'), t('paywall.processingBody'), [
        { text: t('common.ok'), onPress: () => leaveOnSuccess() },
      ]);
    }
  }, [leaveOnSuccess, pollMirrorUntilActive, refreshProfile, syncPurchasesAndRefetch, t, plan]);

  const rcConfigured = isRevenueCatConfigured();
  const embeddedPaywall = isEmbeddedRevenueCatPaywallAvailable();

  const paywallOptions = useMemo(
    () => (offering ? { offering } : {}),
    [offering]
  );

  const shell = (body: ReactNode) => (
    <ScreenShell title={MAISON_PRO_DISPLAY_NAME} onBack={() => leaveOnDismiss()} showBack>
      {body}
    </ScreenShell>
  );

  if (!rcConfigured) {
    return shell(
      <View style={styles.fallback}>
        <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
          {t('paywall.envHint', {
            monthly: RC_PRODUCT_IDS.monthly,
            yearly: RC_PRODUCT_IDS.yearly,
            entitlement: PRIMARY_ENTITLEMENT_ID,
          })}
        </Text>
      </View>
    );
  }

  if (!embeddedPaywall) {
    return shell(
      <View style={styles.fallback}>
        <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>{t('paywall.nativeOnlyHint')}</Text>
      </View>
    );
  }

  if (!offeringReady) {
    return shell(
      <View style={styles.fallback}>
        <ActivityIndicator color={colors.tint} />
      </View>
    );
  }

  return (
    <ScreenShell title={MAISON_PRO_DISPLAY_NAME} onBack={() => leaveOnDismiss()} showBack>
      {isPro && (
        <GroupedList style={styles.banner}>
          <View style={styles.bannerInner}>
            <Text style={[styles.bannerText, { color: colors.tint }]}>{t('paywall.alreadyHave', { plan })}</Text>
          </View>
        </GroupedList>
      )}

      {confirming && (
        <View style={[styles.confirmRow, { backgroundColor: colors.surface }]}>
          <ActivityIndicator color={colors.tint} />
          <Text style={[styles.confirmText, { color: colors.textSecondary }]}>{t('paywall.syncing')}</Text>
        </View>
      )}

      <RevenueCatUI.Paywall
        style={styles.paywall}
        options={paywallOptions}
        onPurchaseStarted={() => {
          suppressDismissRef.current = true;
        }}
        onRestoreStarted={() => {
          suppressDismissRef.current = true;
        }}
        onPurchaseCompleted={() => {
          void onCompletedFlow();
        }}
        onRestoreCompleted={() => {
          void onCompletedFlow();
        }}
        onPurchaseCancelled={() => {
          suppressDismissRef.current = false;
        }}
        onPurchaseError={({ error }) => {
          suppressDismissRef.current = false;
          Alert.alert(t('paywall.purchaseErrorTitle'), error.message ?? t('paywall.purchaseErrorFallback'));
        }}
        onRestoreError={({ error }) => {
          suppressDismissRef.current = false;
          Alert.alert(t('paywall.restoreErrorTitle'), error.message ?? t('paywall.restoreErrorBody'));
        }}
        onDismiss={() => {
          leaveOnDismiss();
        }}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  banner: { marginHorizontal: Layout.screenPaddingX, marginBottom: 12 },
  bannerInner: { padding: 14 },
  bannerText: {
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Layout.screenPaddingX,
  },
  confirmText: {
    marginLeft: 10,
    fontFamily: 'Manrope_400Regular',
  },
  paywall: { flex: 1 },
  fallback: {
    flex: 1,
    paddingHorizontal: Layout.screenPaddingX,
    paddingVertical: Layout.sectionGap,
    justifyContent: 'center',
  },
  fallbackText: {
    lineHeight: 22,
    fontFamily: 'Manrope_400Regular',
  },
});
