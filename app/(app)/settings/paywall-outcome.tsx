import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { resolveReturnTo, withPaywallQuery } from '@/lib/paywall-nav';

/** Legacy route: Trust now purchases. Send leftover links back to the pack picker. */
export default function PaywallOutcome() {
  const router = useRouter();
  const { source, returnTo } = useLocalSearchParams<{ source?: string; returnTo?: string }>();
  const back = resolveReturnTo(returnTo);
  const src = typeof source === 'string' ? source : undefined;

  useEffect(() => {
    router.replace(
      withPaywallQuery('/(app)/settings/paywall-trust', {
        source: src,
        returnTo: back,
      }) as never
    );
  }, [back, router, src]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    </>
  );
}
