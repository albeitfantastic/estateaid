import { Stack, useRouter } from 'expo-router';
import { TrustScreen } from '@/components/paywall/screens/TrustScreen';

export default function PaywallTrust() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: true }} />
      <TrustScreen onContinue={() => router.push('/(app)/settings/paywall-main' as never)} />
    </>
  );
}
