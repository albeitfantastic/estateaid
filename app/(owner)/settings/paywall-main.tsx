import { Stack, useRouter } from 'expo-router';
import { MainPaywallScreen } from '@/components/paywall/screens/MainPaywallScreen';

export default function PaywallMain() {
  const router = useRouter();

  const goExit = () => router.replace('/(owner)/settings/paywall-exit' as never);

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <MainPaywallScreen
        onContinue={() => router.push('/(owner)/settings/paywall-trial' as never)}
        onClose={goExit}
      />
    </>
  );
}
