import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ScreenShell, useScreenTheme } from '@/components/ui/screen-layout';
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
  const { colors } = useScreenTheme();
  const { refetch } = useSubscription();

  const rcConfigured = isRevenueCatConfigured();
  const embeddedCustomerCenter = isEmbeddedRevenueCatCustomerCenterAvailable();

  if (!rcConfigured) {
    return (
      <ScreenShell title="Subscription">
        <View style={styles.fallback}>
          <ThemedText style={{ color: colors.textSecondary, lineHeight: 22 }}>
            Customer Center requires a native build with RevenueCat API keys configured.
          </ThemedText>
        </View>
      </ScreenShell>
    );
  }

  if (!embeddedCustomerCenter) {
    return (
      <ScreenShell title="Subscription">
        <View style={styles.fallback}>
          <ThemedText style={{ color: colors.textSecondary, lineHeight: 22 }}>
            Subscription management UI requires a development or production build with RevenueCat native modules — not
            Expo Go or the web app.
          </ThemedText>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={MAISON_PRO_DISPLAY_NAME}>
      <RevenueCatUI.CustomerCenterView
        style={styles.center}
        shouldShowCloseButton={false}
        onDismiss={() => router.back()}
        onRestoreCompleted={() => void refetch()}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1 },
  fallback: { flex: 1, padding: 24 },
});
