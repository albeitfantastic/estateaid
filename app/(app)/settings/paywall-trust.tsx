import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { TrustScreen } from '@/components/paywall/screens/TrustScreen';
import { resolveReturnTo, withPaywallQuery } from '@/lib/paywall-nav';

export default function PaywallTrust() {
  const router = useRouter();
  const { source, returnTo } = useLocalSearchParams<{ source?: string; returnTo?: string }>();
  const back = resolveReturnTo(returnTo);
  const src = typeof source === 'string' ? source : undefined;

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: true }} />
      <TrustScreen
        onContinue={() =>
          router.push(
            withPaywallQuery('/(app)/settings/paywall-outcome', {
              source: src,
              returnTo: back,
            }) as never
          )
        }
        onClose={() => router.replace(back as never)}
      />
    </>
  );
}
