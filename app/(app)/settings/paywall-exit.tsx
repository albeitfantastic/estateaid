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
          // #region agent log
          fetch('http://127.0.0.1:7410/ingest/3b21f73e-4d1e-45e8-beb0-f14c26a6554d', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '1393f3' },
            body: JSON.stringify({
              sessionId: '1393f3',
              runId: 'post-fix',
              hypothesisId: 'LOOP',
              location: 'paywall-exit.tsx:onSkip',
              message: 'exit skip → safe returnTo',
              data: { rawReturnTo: returnTo ?? null, back },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
          router.replace(back as never);
        }}
      />
    </>
  );
}
