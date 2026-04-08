import { useLocalSearchParams, useRouter } from 'expo-router';
import { PaywallScreen } from '@/components/paywall/paywall-screen';

/**
 * Route wrapper for the RevenueCat paywall.
 *
 * When navigated to with `?fromFlow=true` (from the paywall flow's OutcomeScreen),
 * dismissing routes to the exit offer instead of going home.
 * This ensures the exit offer is shown exactly once per flow session.
 */
export default function OwnerPaywall() {
  const router = useRouter();
  const { fromFlow } = useLocalSearchParams<{ fromFlow?: string }>();

  const handleDismiss =
    fromFlow === 'true'
      ? () => router.replace('/(app)/settings/paywall-exit' as never)
      : undefined;

  return <PaywallScreen onDismiss={handleDismiss} />;
}
