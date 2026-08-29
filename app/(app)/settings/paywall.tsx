import { useLocalSearchParams, useRouter } from 'expo-router';
import { PaywallScreen } from '@/components/paywall/paywall-screen';
import { resolveReturnTo, withPaywallQuery } from '@/lib/paywall-nav';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase';

/**
 * RevenueCat paywall route.
 * fromFlow dismiss → exit; success → rating (once) then returnTo.
 */
export default function PaywallRoute() {
  const router = useRouter();
  const currentUserId = useAuthStore((s) => s.currentUser?.id);
  const { fromFlow, offering, plan, askRating, returnTo, source } = useLocalSearchParams<{
    fromFlow?: string;
    offering?: string;
    plan?: string;
    askRating?: string;
    returnTo?: string;
    source?: string;
  }>();

  const planId = plan === 'monthly' || plan === 'yearly' ? plan : undefined;
  const offeringId = typeof offering === 'string' && offering.length > 0 ? offering : undefined;
  const back = resolveReturnTo(returnTo);
  const src = typeof source === 'string' ? source : undefined;
  const goToRating = fromFlow === 'true' || askRating === 'true';

  const handleDismiss =
    fromFlow === 'true'
      ? () =>
          router.replace(
            withPaywallQuery('/(app)/settings/paywall-exit', {
              plan: planId,
              source: src,
              returnTo: back,
            }) as never
          )
      : undefined;

  const handleSuccess = async () => {
    if (!goToRating) {
      router.replace(back as never);
      return;
    }
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
    router.replace(withPaywallQuery('/(onboarding)/rating', { returnTo: back }) as never);
  };

  return (
    <PaywallScreen
      onDismiss={handleDismiss}
      onSuccess={() => void handleSuccess()}
      offeringIdentifier={offeringId}
      preferredPlanId={planId}
    />
  );
}
