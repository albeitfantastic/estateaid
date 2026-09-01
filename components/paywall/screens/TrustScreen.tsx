import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { SlotPackPicker } from '@/components/paywall/slot-pack-picker';
import { LegalLinks } from '@/components/paywall/ui/LegalLinks';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenScroll, ScreenShell, useScreenTheme } from '@/components/ui/screen-layout';
import { Layout } from '@/constants/theme';
import { isTrialRpcMissingError, startAppTrialRpc } from '@/lib/start-app-trial';
import { confirmPurchaseAccess, alertPurchaseResult } from '@/lib/paywall-complete';
import { isRevenueCatConfigured } from '@/lib/revenuecat-client';
import {
  findOfferingPackage,
  isIntroEligibleForProduct,
  purchasePackage,
  restorePurchases,
} from '@/lib/revenuecat-purchase';
import {
  DEFAULT_SLOT_PACK_ID,
  SLOT_PACKS,
  STORE_TRIAL_DAYS,
  storeOfferDisclosure,
  type BillingCycle,
  type SlotPackId,
} from '@/lib/subscription-config';
import { useSubscription } from '@/providers/subscription-provider';
import { useAuthStore } from '@/store/auth-store';

import { BENEFITS, TRUST_BODY, TRUST_TITLE } from '../paywall-mock-data';
import { MC } from '../paywall-tokens';
import { PaywallCloseButton, PaywallHeaderSpacer } from '../ui/PaywallHeader';
import { PrimaryButton } from '../ui/PrimaryButton';
import { SecondaryButton } from '../ui/SecondaryButton';

interface TrustScreenProps {
  onSuccess: () => void;
  onClose?: () => void;
}

export function TrustScreen({ onSuccess, onClose }: TrustScreenProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors } = useScreenTheme();
  const refreshProfile = useAuthStore((s) => s.refreshProfileFromSupabase);
  const { refetch, syncPurchasesAndRefetch } = useSubscription();
  const [pack, setPack] = useState<SlotPackId>(DEFAULT_SLOT_PACK_ID);
  const [billing, setBilling] = useState<BillingCycle>('annual');
  const [introEligible, setIntroEligible] = useState(true);
  const [busy, setBusy] = useState(false);
  const rcReady = isRevenueCatConfigured();

  const productId = SLOT_PACKS[pack].productIds[billing];

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!rcReady) {
        if (!cancelled) setIntroEligible(true);
        return;
      }
      const eligible = await isIntroEligibleForProduct(productId);
      if (!cancelled) setIntroEligible(eligible);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [productId, rcReady]);

  const finishPurchase = useCallback(async () => {
    const status = await confirmPurchaseAccess({
      refetch,
      syncPurchasesAndRefetch,
      refreshProfile,
      t,
    });
    alertPurchaseResult(status, t, onSuccess);
  }, [onSuccess, refetch, refreshProfile, syncPurchasesAndRefetch, t]);

  async function onCta() {
    if (busy) return;
    if (!rcReady) {
      if (__DEV__) {
        setBusy(true);
        try {
          const r = await startAppTrialRpc();
          if (!r.ok) {
            Alert.alert(
              t('trialFlow.errorTitle'),
              isTrialRpcMissingError(r.reason) ? t('trialFlow.rpcNotDeployedBody') : r.reason
            );
            return;
          }
          await refreshProfile();
          onSuccess();
        } finally {
          setBusy(false);
        }
        return;
      }
      Alert.alert(t('paywall.purchaseErrorTitle'), t('paywall.nativeOnlyHint'));
      return;
    }

    setBusy(true);
    try {
      const pkg = await findOfferingPackage(pack, billing);
      if (!pkg) {
        Alert.alert(t('paywall.purchaseErrorTitle'), t('paywall.packageMissing'));
        return;
      }
      const outcome = await purchasePackage(pkg);
      if (outcome.kind === 'cancelled') return;
      if (outcome.kind === 'failed') {
        Alert.alert(t('paywall.purchaseErrorTitle'), outcome.message);
        return;
      }
      await finishPurchase();
    } finally {
      setBusy(false);
    }
  }

  async function onRestore() {
    if (busy) return;
    if (!rcReady) {
      Alert.alert(t('paywall.restoreErrorTitle'), t('paywall.nativeOnlyHint'));
      return;
    }
    setBusy(true);
    try {
      const r = await restorePurchases();
      if (!r.ok) {
        Alert.alert(t('paywall.restoreErrorTitle'), r.message);
        return;
      }
      await finishPurchase();
    } finally {
      setBusy(false);
    }
  }

  const ctaLabel = !rcReady
    ? __DEV__
      ? t('paywall.devLocalTrialCta')
      : t('paywall.subscribeCta')
    : introEligible
      ? t('paywall.startTrialCta', { days: STORE_TRIAL_DAYS })
      : t('paywall.subscribeCta');

  return (
    <ScreenShell
      title=" "
      showBack={false}
      headerRight={onClose ? <PaywallCloseButton onPress={onClose} /> : <PaywallHeaderSpacer />}
    >
      <ScreenScroll style={styles.scroll} contentContainerStyle={styles.content} gap={Layout.sectionGap} bottomInset={16}>
        <Text style={[styles.title, { color: colors.text }]}>{TRUST_TITLE}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{TRUST_BODY}</Text>

        <SlotPackPicker
          selected={pack}
          billing={billing}
          onSelectPack={setPack}
          onSelectBilling={setBilling}
        />

        <View style={styles.benefits}>
          {BENEFITS.map((benefit) => (
            <View key={benefit.label} style={styles.benefitRow}>
              <IconSymbol name="checkmark.circle.fill" size={17} color={colors.tint} />
              <Text style={[styles.benefitLabel, { color: colors.text }]}>{benefit.label}</Text>
            </View>
          ))}
        </View>
      </ScreenScroll>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 16,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.trialNote, { color: colors.textSecondary }]}>
          {!rcReady
            ? __DEV__
              ? t('paywall.devLocalTrialHint')
              : t('paywall.nativeOnlyHint')
            : storeOfferDisclosure(pack, billing, introEligible)}
        </Text>
        <PrimaryButton label={ctaLabel} onPress={() => void onCta()} disabled={busy} />
        {busy ? <ActivityIndicator color={colors.tint} style={styles.spinner} /> : null}
        <SecondaryButton label={t('paywall.restorePurchases')} onPress={() => void onRestore()} disabled={busy} />
        <LegalLinks />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  title: {
    fontSize: MC.sectionTitle,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.3,
    fontFamily: 'Manrope_700Bold',
  },
  body: {
    fontSize: MC.body,
    lineHeight: 26,
    fontFamily: 'Manrope_400Regular',
    marginTop: -Layout.sectionGap + MC.titleBodyGap,
  },
  trialNote: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Manrope_400Regular',
    marginBottom: 12,
  },
  benefits: { gap: 10 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitLabel: {
    flex: 1,
    fontSize: MC.body,
    lineHeight: 22,
    fontFamily: 'Manrope_400Regular',
  },
  footer: {
    paddingHorizontal: Layout.screenPaddingX,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  spinner: { marginTop: 8 },
});
