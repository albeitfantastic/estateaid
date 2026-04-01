import { Stack, useRouter } from 'expo-router';
import { ExitOfferScreen } from '@/components/paywall/screens/ExitOfferScreen';

export default function PaywallExit() {
  const router = useRouter();

  // Both CTAs lead to the RC paywall WITHOUT fromFlow — dismiss goes home, no re-exit loop
  const goRC = () => router.push('/(owner)/settings/paywall' as never);

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <ExitOfferScreen onClaimOffer={goRC} onContinueRegular={goRC} />
    </>
  );
}
