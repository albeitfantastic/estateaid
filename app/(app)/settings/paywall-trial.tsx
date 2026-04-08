import { Stack, useRouter } from 'expo-router';
import { TrialClarityScreen } from '@/components/paywall/screens/TrialClarityScreen';

export default function PaywallTrial() {
  const router = useRouter();

  const goExit = () => router.replace('/(app)/settings/paywall-exit' as never);

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <TrialClarityScreen
        onContinue={() => router.push('/(app)/settings/paywall-outcome' as never)}
        onClose={goExit}
      />
    </>
  );
}
