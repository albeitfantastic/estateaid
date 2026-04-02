import { useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { OutcomeScreen } from '@/components/paywall/screens/OutcomeScreen';
import { startAppTrialRpc } from '@/lib/start-app-trial';
import { useAuthStore } from '@/store/auth-store';

export default function PaywallOutcome() {
  const router = useRouter();
  const refreshProfile = useAuthStore((s) => s.refreshProfileFromSupabase);
  const [busy, setBusy] = useState(false);

  const goExit = () => router.replace('/(app)/settings/paywall-exit' as never);

  async function onStartTrial() {
    setBusy(true);
    try {
      const r = await startAppTrialRpc();
      if (!r.ok) {
        Alert.alert('Trial', r.reason);
        return;
      }
      await refreshProfile();
      router.replace('/(app)/home' as never);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      {busy ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <OutcomeScreen
          onStartTrial={() => void onStartTrial()}
          onMaybeLater={goExit}
          onClose={goExit}
        />
      )}
    </>
  );
}
