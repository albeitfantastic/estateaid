import { Redirect } from 'expo-router';
import { useState } from 'react';

import { SplashScreenOverlay } from '@/components/ui/splash-screen';
import { isOnboardingCompleteForCurrentUser, useAuthStore } from '@/store/auth-store';

/**
 * Root index screen — acts as the auth gate.
 * Lives inside the Stack (not the layout), so <Redirect> is safe here
 * and won't cause the infinite re-render loop that affects layouts.
 */
export default function Index() {
  const auth = useAuthStore();
  const { currentUser, isHydrated, skipOnboardingForInvite, pendingInviteCode } = auth;
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return (
      <SplashScreenOverlay
        isHydrated={isHydrated}
        onDone={() => setSplashDone(true)}
      />
    );
  }

  if (!currentUser) {
    return <Redirect href={'/(auth)' as never} />;
  }

  const skipOnboarding =
    skipOnboardingForInvite || Boolean(pendingInviteCode?.trim());

  if (!isOnboardingCompleteForCurrentUser(auth) && !skipOnboarding) {
    return <Redirect href={'/(onboarding)/q1' as never} />;
  }

  return <Redirect href={'/(app)/home' as never} />;
}
