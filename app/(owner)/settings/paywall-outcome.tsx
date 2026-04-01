import { Stack, useRouter } from 'expo-router';
import { OutcomeScreen } from '@/components/paywall/screens/OutcomeScreen';

export default function PaywallOutcome() {
  const router = useRouter();

  const goExit = () => router.replace('/(owner)/settings/paywall-exit' as never);

  // fromFlow=true tells the RC paywall to route its dismiss → exit offer
  const goRC = () => router.push('/(owner)/settings/paywall?fromFlow=true' as never);

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <OutcomeScreen
        onStartTrial={goRC}
        onMaybeLater={goExit}
        onClose={goExit}
      />
    </>
  );
}
