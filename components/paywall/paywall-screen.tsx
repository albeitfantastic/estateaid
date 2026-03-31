import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { isRevenueCatConfigured } from '@/lib/revenuecat-client';
import { MAISON_PRO_DISPLAY_NAME, PRIMARY_ENTITLEMENT_ID, RC_PRODUCT_IDS } from '@/lib/subscription-config';
import { fetchSubscriptionEntitlements, rowGrantsAccess } from '@/lib/subscription-access';
import { isEmbeddedRevenueCatPaywallAvailable, RevenueCatUI } from '@/lib/revenuecat-ui';
import { useSubscription } from '@/providers/subscription-provider';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * RevenueCat Paywall (dashboard-designed UI via react-native-purchases-ui).
 * Products `monthly` / `yearly` should be on the current offering in RevenueCat.
 * Trusted unlock still follows Supabase mirror after webhook; we poll after purchase/restore.
 */
export function PaywallScreen() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { refetch, isPro, loading: subLoading } = useSubscription();

  const [confirming, setConfirming] = useState(false);

  /** After `replace` from onboarding there is no stack to pop — go to the correct home tab. */
  const leavePaywall = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    const root = segments[0];
    router.replace((root === '(guest)' ? '/(guest)/home' : '/(owner)/home') as never);
  }, [router, segments]);

  const pollMirrorUntilActive = useCallback(async (maxAttempts = 8) => {
    setConfirming(true);
    try {
      for (let i = 0; i < maxAttempts; i++) {
        await refetch();
        await sleep(1500);
        const { data } = await fetchSubscriptionEntitlements();
        const row = data?.find((r) => r.entitlement_id === PRIMARY_ENTITLEMENT_ID);
        if (row && rowGrantsAccess(row)) return true;
      }
    } finally {
      setConfirming(false);
    }
    return false;
  }, [refetch]);

  const onCompletedFlow = useCallback(async () => {
    const ok = await pollMirrorUntilActive();
    if (ok) {
      Alert.alert('Welcome to ' + MAISON_PRO_DISPLAY_NAME, 'Your subscription is active.', [
        { text: 'OK', onPress: () => leavePaywall() },
      ]);
    } else {
      Alert.alert(
        'Processing',
        'Purchase recorded. It can take a moment for your account to update — use Refresh status in Settings if needed.'
      );
    }
  }, [leavePaywall, pollMirrorUntilActive, router]);

  const disabled = confirming || subLoading;

  const rcConfigured = isRevenueCatConfigured();
  const embeddedPaywall = isEmbeddedRevenueCatPaywallAvailable();

  if (!rcConfigured) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => leavePaywall()} style={styles.back}>
            <IconSymbol name="arrow.left" size={22} color={colors.tint} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>
            {MAISON_PRO_DISPLAY_NAME}
          </ThemedText>
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.fallback}>
          <ThemedText style={{ color: colors.icon, lineHeight: 22 }}>
            Add EXPO_PUBLIC_REVENUECAT_API_KEY (or iOS/Android keys) in your env and use a dev/production build with
            native IAP. Expected products: {RC_PRODUCT_IDS.monthly}, {RC_PRODUCT_IDS.yearly}. Entitlement:{' '}
            {PRIMARY_ENTITLEMENT_ID}.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!embeddedPaywall) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => leavePaywall()} style={styles.back}>
            <IconSymbol name="arrow.left" size={22} color={colors.tint} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>
            {MAISON_PRO_DISPLAY_NAME}
          </ThemedText>
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.fallback}>
          <ThemedText style={{ color: colors.icon, lineHeight: 22 }}>
            The in-app paywall needs a development or production build with RevenueCat native UI. It does not run in Expo
            Go or in the browser — open the app from an iOS/Android build to subscribe or restore.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => leavePaywall()} style={styles.back} disabled={disabled}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>
          {MAISON_PRO_DISPLAY_NAME}
        </ThemedText>
        <View style={{ width: 30 }} />
      </View>

      {isPro && (
        <View style={[styles.banner, { backgroundColor: colors.tint + '18', borderColor: colors.tint + '44' }]}>
          <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
            You already have {MAISON_PRO_DISPLAY_NAME}.
          </ThemedText>
        </View>
      )}

      {confirming && (
        <View style={[styles.confirmRow, { backgroundColor: colors.surface }]}>
          <ActivityIndicator color={colors.tint} />
          <ThemedText style={{ color: colors.icon, marginLeft: 10 }}>Syncing subscription…</ThemedText>
        </View>
      )}

      <RevenueCatUI.Paywall
        style={styles.paywall}
        options={{}}
        onPurchaseCompleted={() => void onCompletedFlow()}
        onRestoreCompleted={() => void onCompletedFlow()}
        onPurchaseError={({ error }) => {
          Alert.alert('Purchase error', error.message ?? 'Something went wrong.');
        }}
        onRestoreError={({ error }) => {
          Alert.alert('Restore error', error.message ?? 'Restore failed.');
        }}
        onDismiss={() => leavePaywall()}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: '700' },
  banner: { marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  paywall: { flex: 1 },
  fallback: { flex: 1, padding: 24 },
});
