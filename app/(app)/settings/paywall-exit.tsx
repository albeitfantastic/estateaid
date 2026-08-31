import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { ExitOfferScreen } from '@/components/paywall/screens/ExitOfferScreen';
import { resolveReturnTo, withPaywallQuery } from '@/lib/paywall-nav';
import { EXIT_OFFERING_ID } from '@/lib/subscription-config';

export default function PaywallExit() {
  const router = useRouter();
  const { plan, returnTo, source } = useLocalSearchParams<{
    plan?: string;
    returnTo?: string;
    source?: string;
  }>();
  const planId = plan === 'monthly' || plan === 'yearly' ? plan : undefined;
  const back = resolveReturnTo(returnTo);
  const src = typeof source === 'string' ? source : undefined;

  function paywallHref(offering?: string) {
    return withPaywallQuery('/(app)/settings/paywall', {
      askRating: 'true',
      offering,
      plan: planId,
      returnTo: back,
      source: src,
    });
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <ExitOfferScreen
        onClaimOffer={() => router.replace(paywallHref(EXIT_OFFERING_ID) as never)}
        onContinueRegular={() => router.replace(paywallHref() as never)}
        onSkip={() => {
          router.replace(back as never);
        }}
      />
    </>
  );
}
