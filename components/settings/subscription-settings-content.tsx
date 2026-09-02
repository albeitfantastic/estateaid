import { Alert, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { inputBaseStyle } from '@/components/ui/focus-input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  GroupedList,
  GroupedRow,
  OutlineButton,
  FilledButton,
  ScreenScroll,
  ScreenShell,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { trialDaysRemaining } from '@/lib/access-tier-core';
import { useAccountContext } from '@/lib/entitlements/capabilities';
import { formatDate } from '@/lib/date-utils';
import { isRevenueCatConfigured } from '@/lib/revenuecat-client';
import { isRevenueCatUiAvailable } from '@/lib/revenuecat-ui';
import { MAISON_PRO_DISPLAY_NAME } from '@/lib/subscription-config';
import { supportMailto } from '@/lib/support';
import { useSubscription } from '@/providers/subscription-provider';

export function SubscriptionSettingsContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const { slotCount, propertiesSponsored, trialEndsAt } = useAccountContext();
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
  const trialActive = trialDaysRemaining(trialEndsAt) != null;

  const trialEndLabel =
    trialEndsAt && trialEndsAt.length >= 10
      ? formatDate(trialEndsAt.slice(0, 10))
      : '—';

  const planLine = hasSlots
    ? t('subscriptionSettings.slotsHeld', { count: slotCount })
    : t('subscriptionSettings.noSlots');

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
      <ScreenScroll contentContainerStyle={styles.form} gap={16}>
        <View style={styles.field}>
          <ThemedText style={[inputBaseStyle.label, { color: colors.icon }]}>
            {t('subscriptionSettings.currentPlan')}
          </ThemedText>
          <GroupedList>
            <GroupedRow
              title={planLine + (loading ? t('subscriptionSettings.loadingSuffix') : '')}
              subtitle={subtitleLines.join('\n') || undefined}
              isLast
            />
          </GroupedList>
        </View>

        <View style={styles.actions}>
          {!hasSlots ? (
            <>
              <FilledButton
                tone="accent"
                label={t('subscriptionSettings.startTrialFlow')}
                onPress={() => router.push('./paywall-trust' as never)}
              />
              <ThemedText style={[styles.hint, { color: colors.icon }]}>
                {t('subscriptionSettings.standardUpgradeHint')}
              </ThemedText>
            </>
          ) : null}

          {!isPro ? (
            <>
              <FilledButton
                tone="accent"
                label={t('subscriptionSettings.viewPaywall')}
                onPress={() => router.push('./paywall' as never)}
              />
              <OutlineButton label={t('subscriptionSettings.syncStore')} onPress={() => void syncPurchasesAndRefetch()} />
            </>
          ) : null}

          {storeLooksActive && isRevenueCatUiAvailable() ? (
            <OutlineButton
              label={t('subscriptionSettings.customerCenter')}
              onPress={() => router.push('./customer-center' as never)}
            />
          ) : null}

          {storeLooksActive && isPro ? (
            <OutlineButton
              label={t('subscriptionSettings.systemSubSettings')}
              onPress={() => void openManageSubscriptions()}
            />
          ) : null}

          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: colors.error }]}
            onPress={cancelOrManage}
            activeOpacity={0.7}
          >
            <IconSymbol name="trash" size={16} color={colors.error} />
            <ThemedText style={{ color: colors.error, fontWeight: '600' }}>
              {isPro ? t('subscriptionSettings.cancelOrChange') : t('subscriptionSettings.cancelSub')}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  form: { paddingTop: 8 },
  field: { gap: 6 },
  actions: { gap: 16, marginTop: 20 },
  hint: { fontSize: 13, lineHeight: 18 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
});
