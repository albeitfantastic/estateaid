import { Alert, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { loadAllStores } from '@/lib/load-all-stores';
import { isRevenueCatConfigured } from '@/lib/revenuecat-client';
import { isRevenueCatUiAvailable } from '@/lib/revenuecat-ui';
import { MAISON_PRO_DISPLAY_NAME } from '@/lib/subscription-config';
import { supportMailto } from '@/lib/support';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/date-utils';
import { useAuthStore } from '@/store/auth-store';
import { useSubscription } from '@/providers/subscription-provider';

export function SubscriptionSettingsContent() {
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

  const role = currentUser?.role;
  const isGuest = role === 'guest';
  const isOwner = role === 'owner';

  const planLine = isGuest
    ? 'Guest — free'
    : isPro
      ? `Owner — ${MAISON_PRO_DISPLAY_NAME}`
      : selectedTier === 'premium'
        ? `Owner — ${MAISON_PRO_DISPLAY_NAME} (pending)`
        : 'Owner — Starter';

  async function upgradeToOwner() {
    if (!currentUser) return;
    Alert.alert(
      'Become a host',
      'You will switch to an owner account and can add properties and invite guests.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            const { error } = await supabase.from('profiles').update({ role: 'owner' }).eq('id', currentUser.id);
            if (error) {
              Alert.alert('Could not upgrade', error.message);
              return;
            }
            patchUser({ role: 'owner' });
            await loadAllStores();
            router.replace('/(owner)/home' as never);
          },
        },
      ]
    );
  }

  async function openManageSubscriptions() {
    if (!isRevenueCatConfigured()) {
      Alert.alert(
        'Manage subscription',
        'Open the App Store or Play Store subscriptions page for this Apple/Google account.',
        [{ text: 'OK' }]
      );
      return;
    }
    try {
      await presentManageSubscriptions();
    } catch {
      Alert.alert('Could not open', 'Use your device subscription settings for this app.');
    }
  }

  function cancelOrManage() {
    if (!isOwner) {
      Alert.alert('Guests', 'Guest accounts do not have an app subscription. Contact the property host if needed.');
      return;
    }
    if (isPro) {
      if (isRevenueCatUiAvailable()) {
        router.push('./customer-center' as never);
        return;
      }
      void openManageSubscriptions();
      return;
    }
    Alert.alert(
      'Cancel subscription',
      'You do not have an active paid subscription in our records. If you believe this is wrong, contact support.',
      [
        { text: 'OK' },
        {
          text: 'Contact support',
          onPress: () =>
            void Linking.openURL(
              supportMailto('Subscription', `I need help with my ${MAISON_PRO_DISPLAY_NAME} subscription.`)
            ),
        },
      ]
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.inner, { paddingBottom: insets.bottom + 24 }]}>
        <ThemedText style={[styles.sectionTitle, { color: colors.icon }]}>Current plan</ThemedText>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ThemedText type="defaultSemiBold" style={styles.planText}>
            {planLine}
            {loading ? ' · …' : ''}
          </ThemedText>
          {isOwner && (
            <ThemedText style={[styles.sub, { color: colors.icon }]}>
              {isPro
                ? `${MAISON_PRO_DISPLAY_NAME} is confirmed on our servers after purchase (webhook sync).`
                : sdkMaisonProActive && !isPro
                  ? 'Store shows an active subscription; waiting for account sync. Tap Sync below.'
                  : selectedTier === 'premium'
                    ? `Complete checkout to activate ${MAISON_PRO_DISPLAY_NAME} on this account.`
                    : `Starter is the default owner plan. Upgrade to ${MAISON_PRO_DISPLAY_NAME} for premium features.`}
            </ThemedText>
          )}
          {isPro && primaryRow?.expires_at && (
            <ThemedText style={[styles.sub, { color: colors.icon, marginTop: 6 }]}>
              Renews or ends: {formatDate(primaryRow.expires_at.slice(0, 10))}
            </ThemedText>
          )}
        </View>

        {isGuest && (
          <>
            <ThemedText style={[styles.sectionTitle, { color: colors.icon, marginTop: 24 }]}>Upgrade</ThemedText>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.tint }]}
              onPress={() => void upgradeToOwner()}
              activeOpacity={0.85}
            >
              <ThemedText style={styles.primaryBtnText}>Upgrade to owner</ThemedText>
            </TouchableOpacity>
            <ThemedText style={[styles.sub, { color: colors.icon, marginTop: 8 }]}>
              List properties and manage guest stays from the owner app.
            </ThemedText>
          </>
        )}

        {isOwner && !isPro && (
          <>
            <ThemedText style={[styles.sectionTitle, { color: colors.icon, marginTop: 28 }]}>
              {MAISON_PRO_DISPLAY_NAME}
            </ThemedText>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.tint }]}
              onPress={() => router.push('./paywall' as never)}
              activeOpacity={0.85}
            >
              <ThemedText style={styles.primaryBtnText}>View paywall</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.outlineBtn, { borderColor: colors.tint, marginTop: 10 }]}
              onPress={() => void syncPurchasesAndRefetch()}
              activeOpacity={0.8}
            >
              <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>Sync with App Store / Play Store</ThemedText>
            </TouchableOpacity>
          </>
        )}

        <ThemedText style={[styles.sectionTitle, { color: colors.icon, marginTop: 28 }]}>Manage</ThemedText>
        {isOwner && isRevenueCatUiAvailable() && (
          <TouchableOpacity
            style={[styles.outlineBtn, { borderColor: colors.tint }]}
            onPress={() => router.push('./customer-center' as never)}
            activeOpacity={0.8}
          >
            <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>Customer Center</ThemedText>
          </TouchableOpacity>
        )}
        {isOwner && isPro && (
          <TouchableOpacity
            style={[styles.outlineBtn, { borderColor: colors.tint, marginTop: 10 }]}
            onPress={() => void openManageSubscriptions()}
            activeOpacity={0.8}
          >
            <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>System subscription settings</ThemedText>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.outlineBtn, { borderColor: colors.error, marginTop: 10 }]}
          onPress={cancelOrManage}
          activeOpacity={0.8}
        >
          <ThemedText style={{ color: colors.error, fontWeight: '600' }}>
            {isOwner && isPro ? 'Cancel or change plan' : 'Cancel subscription'}
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
