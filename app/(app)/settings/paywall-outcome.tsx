import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OutcomeScreen } from '@/components/paywall/screens/OutcomeScreen';
import { resolveReturnTo, withPaywallQuery } from '@/lib/paywall-nav';
import { getRevenueCatApiKey } from '@/lib/subscription-config';
import { isTrialRpcMissingError, startAppTrialRpc } from '@/lib/start-app-trial';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase';

export default function PaywallOutcome() {
  const { t } = useTranslation();
  const router = useRouter();
  const { plan, source, returnTo } = useLocalSearchParams<{
    plan?: string;
    source?: string;
    returnTo?: string;
  }>();
  const refreshProfile = useAuthStore((s) => s.refreshProfileFromSupabase);
  const currentUserId = useAuthStore((s) => s.currentUser?.id);
  const [busy, setBusy] = useState(false);

  const planId = useMemo(
    () => (plan === 'monthly' || plan === 'yearly' ? plan : undefined),
    [plan]
  );
  const src = typeof source === 'string' ? source : undefined;
  const back = resolveReturnTo(returnTo);

  const goExit = () =>
    router.replace(
      withPaywallQuery('/(app)/settings/paywall-exit', {
        plan: planId,
        source: src,
        returnTo: back,
      }) as never
    );

  async function goRatingOrReturn() {
    const { data } = currentUserId
      ? await supabase
          .from('profiles')
          .select('rating_prompt_shown_at')
          .eq('id', currentUserId)
          .maybeSingle()
      : { data: null };
    if (data?.rating_prompt_shown_at) {
      router.replace(back as never);
      return;
    }
    router.replace(
      withPaywallQuery('/(onboarding)/rating', { returnTo: back }) as never
    );
  }

  async function onStartTrial() {
    if (getRevenueCatApiKey()) {
      router.replace(
        withPaywallQuery('/(app)/settings/paywall', {
          fromFlow: 'true',
          plan: planId,
          source: src,
          returnTo: back,
        }) as never
      );
      return;
    }

    setBusy(true);
    try {
      const r = await startAppTrialRpc();
      if (!r.ok) {
        Alert.alert(
          t('trialFlow.errorTitle'),
          isTrialRpcMissingError(r.reason) ? t('trialFlow.rpcNotDeployedBody') : r.reason
        );
        return;
      }
      await refreshProfile();
      await goRatingOrReturn();
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
