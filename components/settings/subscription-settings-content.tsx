import { Alert, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDate } from '@/lib/date-utils';
import { loadAllStores } from '@/lib/load-all-stores';
import { isRevenueCatConfigured } from '@/lib/revenuecat-client';
import { isRevenueCatUiAvailable } from '@/lib/revenuecat-ui';
import { MAISON_PRO_DISPLAY_NAME } from '@/lib/subscription-config';
import { supportMailto } from '@/lib/support';
import { supabase } from '@/lib/supabase';
import { useSubscription } from '@/providers/subscription-provider';
import { useAuthStore } from '@/store/auth-store';

export function SubscriptionSettingsContent() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const selectedTier = useAuthStore((s) => s.selectedTier);
  const patchUser = useAuthStore((s) => s.patchUser);
  const {
    isPro,
    sdkMaisonProActive,
    loading,
    primaryRow,
    syncPurchasesAndRefetch,
    presentManageSubscriptions,
  } = useSubscription();

  const plan = MAISON_PRO_DISPLAY_NAME;
  const role = currentUser?.role;
  const isGuest = role === 'guest';
  const isOwner = role === 'owner';

  const planLine = isGuest
    ? t('subscriptionSettings.planGuest')
    : isPro
      ? t('subscriptionSettings.planOwnerPro', { plan })
      : selectedTier === 'premium'
        ? t('subscriptionSettings.planOwnerProPending', { plan })
        : t('subscriptionSettings.planOwnerStarter');

  async function upgradeToOwner() {
    if (!currentUser) return;
    Alert.alert(t('subscriptionSettings.becomeHostTitle'), t('subscriptionSettings.becomeHostBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.continue'),
        onPress: async () => {
          const { error } = await supabase.from('profiles').update({ role: 'owner' }).eq('id', currentUser.id);
          if (error) {
            Alert.alert(t('subscriptionSettings.upgradeFailTitle'), error.message);
            return;
          }
          patchUser({ role: 'owner' });
          await loadAllStores();
          router.replace('/(owner)/home' as never);
        },
      },
    ]);
  }

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
    if (!isOwner) {
      Alert.alert(t('subscriptionSettings.guestsTitle'), t('subscriptionSettings.guestsBody'));
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
    <ThemedView style={styles.container}>
      <View style={[styles.inner, { paddingBottom: insets.bottom + 24 }]}>
        <ThemedText style={[styles.sectionTitle, { color: colors.icon }]}>
          {t('subscriptionSettings.currentPlan')}
        </ThemedText>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ThemedText type="defaultSemiBold" style={styles.planText}>
            {planLine}
            {loading ? t('subscriptionSettings.loadingSuffix') : ''}
          </ThemedText>
          {isOwner && (
            <ThemedText style={[styles.sub, { color: colors.icon }]}>
              {isPro
                ? t('subscriptionSettings.proConfirmed', { plan })
                : sdkMaisonProActive && !isPro
                  ? t('subscriptionSettings.storeWaiting')
                  : selectedTier === 'premium'
                    ? t('subscriptionSettings.completeCheckout', { plan })
                    : t('subscriptionSettings.starterDefault', { plan })}
            </ThemedText>
          )}
          {isPro && primaryRow?.expires_at && (
            <ThemedText style={[styles.sub, { color: colors.icon, marginTop: 6 }]}>
              {t('subscriptionSettings.renewsEnds', {
                date: formatDate(primaryRow.expires_at.slice(0, 10)),
              })}
            </ThemedText>
          )}
        </View>

        {isGuest && (
          <>
            <ThemedText style={[styles.sectionTitle, { color: colors.icon, marginTop: 24 }]}>
              {t('subscriptionSettings.upgradeSection')}
            </ThemedText>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.tint }]}
              onPress={() => void upgradeToOwner()}
              activeOpacity={0.85}
            >
              <ThemedText style={styles.primaryBtnText}>{t('subscriptionSettings.upgradeCta')}</ThemedText>
            </TouchableOpacity>
            <ThemedText style={[styles.sub, { color: colors.icon, marginTop: 8 }]}>
              {t('subscriptionSettings.upgradeHint')}
            </ThemedText>
          </>
        )}

        {isOwner && !isPro && (
          <>
            <ThemedText style={[styles.sectionTitle, { color: colors.icon, marginTop: 28 }]}>
              {t('subscriptionSettings.maisonSection', { plan })}
            </ThemedText>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.tint }]}
              onPress={() => router.push('./paywall' as never)}
              activeOpacity={0.85}
            >
              <ThemedText style={styles.primaryBtnText}>{t('subscriptionSettings.viewPaywall')}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.outlineBtn, { borderColor: colors.tint, marginTop: 10 }]}
              onPress={() => void syncPurchasesAndRefetch()}
              activeOpacity={0.8}
            >
              <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>{t('subscriptionSettings.syncStore')}</ThemedText>
            </TouchableOpacity>
          </>
        )}

        <ThemedText style={[styles.sectionTitle, { color: colors.icon, marginTop: 28 }]}>
          {t('subscriptionSettings.manageSection')}
        </ThemedText>
        {isOwner && isRevenueCatUiAvailable() && (
          <TouchableOpacity
            style={[styles.outlineBtn, { borderColor: colors.tint }]}
            onPress={() => router.push('./customer-center' as never)}
            activeOpacity={0.8}
          >
            <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>
              {t('subscriptionSettings.customerCenter')}
            </ThemedText>
          </TouchableOpacity>
        )}
        {isOwner && isPro && (
          <TouchableOpacity
            style={[styles.outlineBtn, { borderColor: colors.tint, marginTop: 10 }]}
            onPress={() => void openManageSubscriptions()}
            activeOpacity={0.8}
          >
            <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>
              {t('subscriptionSettings.systemSubSettings')}
            </ThemedText>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.outlineBtn, { borderColor: colors.error, marginTop: 10 }]}
          onPress={cancelOrManage}
          activeOpacity={0.8}
        >
          <ThemedText style={{ color: colors.error, fontWeight: '600' }}>
            {isOwner && isPro ? t('subscriptionSettings.cancelOrChange') : t('subscriptionSettings.cancelSub')}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { paddingHorizontal: 20, paddingTop: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16 },
  planText: { fontSize: 18 },
  sub: { fontSize: 14, marginTop: 8, lineHeight: 20 },
  primaryBtn: { marginTop: 4, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  outlineBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
});
