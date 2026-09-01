import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { TrustScreen } from '@/components/paywall/screens/TrustScreen';
import { resolvePurchaseReturnTo, resolveReturnTo, withPaywallQuery } from '@/lib/paywall-nav';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase';

export default function PaywallTrust() {
  const router = useRouter();
  const { source, returnTo } = useLocalSearchParams<{ source?: string; returnTo?: string }>();
  const dismissTo = resolveReturnTo(returnTo);
  const successTo = resolvePurchaseReturnTo(returnTo);
  const currentUserId = useAuthStore((s) => s.currentUser?.id);

  async function onSuccess() {
    const { data } = currentUserId
      ? await supabase
          .from('profiles')
          .select('rating_prompt_shown_at')
          .eq('id', currentUserId)
          .maybeSingle()
      : { data: null };
    if (data?.rating_prompt_shown_at) {
      router.replace(successTo as never);
      return;
    }
    router.replace(withPaywallQuery('/(onboarding)/rating', { returnTo: successTo }) as never);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: true }} />
      <TrustScreen onSuccess={() => void onSuccess()} onClose={() => router.replace(dismissTo as never)} />
    </>
  );
}
