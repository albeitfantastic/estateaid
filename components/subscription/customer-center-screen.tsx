import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { isRevenueCatConfigured } from '@/lib/revenuecat-client';
import { MAISON_PRO_DISPLAY_NAME } from '@/lib/subscription-config';
import { isEmbeddedRevenueCatCustomerCenterAvailable, RevenueCatUI } from '@/lib/revenuecat-ui';
import { useSubscription } from '@/providers/subscription-provider';

/**
 * Embedded RevenueCat Customer Center (manage plan, restore, etc. per dashboard config).
 * @see https://www.revenuecat.com/docs/tools/customer-center
 */
export function CustomerCenterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { refetch } = useSubscription();

  const rcConfigured = isRevenueCatConfigured();
  const embeddedCustomerCenter = isEmbeddedRevenueCatCustomerCenterAvailable();

  if (!rcConfigured) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <IconSymbol name="arrow.left" size={22} color={colors.tint} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>
            Subscription
          </ThemedText>
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.fallback}>
          <ThemedText style={{ color: colors.icon, lineHeight: 22 }}>
            Customer Center requires a native build with RevenueCat API keys configured.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!embeddedCustomerCenter) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <IconSymbol name="arrow.left" size={22} color={colors.tint} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>
            Subscription
          </ThemedText>
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.fallback}>
          <ThemedText style={{ color: colors.icon, lineHeight: 22 }}>
            Subscription management UI requires a development or production build with RevenueCat native modules — not
            Expo Go or the web app.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>
          {MAISON_PRO_DISPLAY_NAME}
        </ThemedText>
        <View style={{ width: 30 }} />
      </View>
      <RevenueCatUI.CustomerCenterView
        style={styles.center}
        shouldShowCloseButton={false}
        onDismiss={() => router.back()}
        onRestoreCompleted={() => void refetch()}
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
  center: { flex: 1 },
  fallback: { flex: 1, padding: 24 },
});
