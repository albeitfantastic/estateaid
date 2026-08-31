import { Alert, Linking, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import {
  GroupedList,
  GroupedRow,
  OutlineButton,
  FilledButton,
  ScreenScroll,
  ScreenShell,
  SectionLabel,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { Layout, Radius } from '@/constants/theme';
import { trialDaysRemaining } from '@/lib/access-tier-core';
import { useAccountContext } from '@/lib/entitlements/capabilities';
import { formatDate } from '@/lib/date-utils';
import { isRevenueCatConfigured } from '@/lib/revenuecat-client';
import { isRevenueCatUiAvailable } from '@/lib/revenuecat-ui';
import { MAISON_PRO_DISPLAY_NAME } from '@/lib/subscription-config';
import { supportMailto } from '@/lib/support';
import { useSubscription } from '@/providers/subscription-provider';
import { useAuthStore } from '@/store/auth-store';

export function SubscriptionSettingsContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const currentUser = useAuthStore((s) => s.currentUser);
  const { slotCount, propertiesSponsored } = useAccountContext();
  const {
    isPro,
    sdkMaisonProActive,
    loading,
    primaryRow,
    syncPurchasesAndRefetch,
    presentManageSubscriptions,
  } = useSubscription();

  const plan = MAISON_PRO_DISPLAY_NAME;
  const storeLooksActive = isPro || sdkMaisonProActive;
  const hasSlots = slotCount > 0;
  const trialActive = trialDaysRemaining(currentUser?.trialEndsAt) != null;

  const trialEndLabel =
    currentUser?.trialEndsAt && currentUser.trialEndsAt.length >= 10
      ? formatDate(currentUser.trialEndsAt.slice(0, 10))
      : '—';

  const planLine = hasSlots
    ? t('subscriptionSettings.slotsHeld', { count: slotCount })
    : t('subscriptionSettings.noSlots');

  /** §6.1: state the trial length, the end date, and that nothing is charged or renews. */
  const subtitleLines = [
    hasSlots
      ? t('subscriptionSettings.slotsInUse', { used: propertiesSponsored, total: slotCount })
      : t('subscriptionSettings.noSlotsSub'),
    trialActive ? t('subscriptionSettings.trialUntil', { date: trialEndLabel }) : undefined,
    trialActive ? t('subscriptionSettings.trialNoPayment') : undefined,
    sdkMaisonProActive && !primaryRow ? t('subscriptionSettings.storeWaiting') : undefined,
    !trialActive && primaryRow?.expires_at
      ? t('subscriptionSettings.renewsEnds', {
          date: formatDate(primaryRow.expires_at.slice(0, 10)),
        })
      : undefined,
  ].filter(Boolean) as string[];

  async function openManageSubscriptions() {
    if (!isRevenueCatConfigured()) {
      Alert.alert(t('subscriptionSettings.manageSubTitle'), t('subscriptionSettings.manageSubBody'), [
        { text: t('common.ok') },
      ]);
      return;
    }
    try {
      await presentManageSubscriptions();
    } catch {
      Alert.alert(t('subscriptionSettings.couldNotOpenTitle'), t('subscriptionSettings.couldNotOpenBody'));
    }
  }

  function cancelOrManage() {
    const rcUi = isRevenueCatUiAvailable();
    const storeActiveNoMirror = !isPro && sdkMaisonProActive;
    if (!storeLooksActive && !storeActiveNoMirror) {
      Alert.alert(
        t('subscriptionSettings.standardManageTitle'),
        t('subscriptionSettings.standardManageBody', { plan }),
        [
          { text: t('subscriptionSettings.viewPaywall'), onPress: () => router.push('./paywall' as never) },
          { text: t('common.close'), style: 'cancel' },
        ]
      );
      return;
    }
    if (isPro || storeActiveNoMirror) {
      if (rcUi) {
        router.push('./customer-center' as never);
        return;
      }
      void openManageSubscriptions();
      return;
    }
    Alert.alert(
      t('subscriptionSettings.cancelChangeTitle'),
      t('subscriptionSettings.cancelChangeBody', { plan }),
      [
        ...(isRevenueCatConfigured()
          ? ([
              {
                text: t('subscriptionSettings.openSubSettings'),
                onPress: () => void openManageSubscriptions(),
              },
            ] as const)
          : []),
        ...(rcUi
          ? ([
              {
                text: t('subscriptionSettings.customerCenter'),
                onPress: () => router.push('./customer-center' as never),
              },
            ] as const)
          : []),
        { text: t('subscriptionSettings.syncWithStore'), onPress: () => void syncPurchasesAndRefetch() },
        {
          text: t('common.contactSupport'),
          onPress: () =>
            void Linking.openURL(
              supportMailto(
                t('subscriptionSettings.subscriptionMailSubject'),
                t('subscriptionSettings.subscriptionMailBody', { plan })
              )
            ),
        },
        { text: t('common.close'), style: 'cancel' },
      ]
    );
  }

  return (
    <ScreenShell title={t('settingsHub.manageSubscription')}>
      <ScreenScroll contentContainerStyle={styles.scroll}>
        <SectionLabel>{t('subscriptionSettings.currentPlan')}</SectionLabel>
        <GroupedList>
          <GroupedRow
            title={planLine + (loading ? t('subscriptionSettings.loadingSuffix') : '')}
            subtitle={subtitleLines.join('\n') || undefined}
            isLast
          />
        </GroupedList>

        {!hasSlots && (
          <>
            <SectionLabel marginTop={Layout.sectionGap}>{t('subscriptionSettings.upgradeSection')}</SectionLabel>
            <FilledButton
              tone="accent"
              label={t('subscriptionSettings.startTrialFlow')}
              onPress={() => router.push('./paywall-trust' as never)}
            />
            <ThemedText style={[styles.sub, { color: colors.textSecondary, marginTop: 8 }]}>
              {t('subscriptionSettings.standardUpgradeHint')}
            </ThemedText>
          </>
        )}

        {!isPro && (
          <>
            <SectionLabel marginTop={Layout.sectionGap}>
              {t('subscriptionSettings.maisonSection', { plan })}
            </SectionLabel>
            <FilledButton
              tone="accent"
              label={t('subscriptionSettings.viewPaywall')}
              onPress={() => router.push('./paywall' as never)}
            />
            <OutlineButton label={t('subscriptionSettings.syncStore')} onPress={() => void syncPurchasesAndRefetch()} />
          </>
        )}

        <SectionLabel marginTop={Layout.sectionGap}>{t('subscriptionSettings.manageSection')}</SectionLabel>
        {storeLooksActive && isRevenueCatUiAvailable() && (
          <OutlineButton
            label={t('subscriptionSettings.customerCenter')}
            onPress={() => router.push('./customer-center' as never)}
          />
        )}
        {storeLooksActive && isPro && (
          <OutlineButton
            label={t('subscriptionSettings.systemSubSettings')}
            onPress={() => void openManageSubscriptions()}
          />
        )}
        <TouchableOpacity
          style={[styles.dangerOutline, { borderColor: colors.error }]}
          onPress={cancelOrManage}
          activeOpacity={0.8}
        >
          <ThemedText style={{ color: colors.error, fontWeight: '600' }}>
            {isPro ? t('subscriptionSettings.cancelOrChange') : t('subscriptionSettings.cancelSub')}
          </ThemedText>
        </TouchableOpacity>
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: Layout.sectionGap - 8 },
  sub: { fontSize: 14, marginTop: 8, lineHeight: 20 },
  dangerOutline: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1.5,
  },
});
