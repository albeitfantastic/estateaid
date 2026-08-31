import { Redirect } from 'expo-router';
import { useState } from 'react';

import { SplashScreenOverlay } from '@/components/ui/splash-screen';
import { agentLog } from '@/lib/debug-agent-log';
import { isOnboardingCompleteForCurrentUser, useAuthStore } from '@/store/auth-store';

/**
 * Root index screen — acts as the auth gate.
 * Lives inside the Stack (not the layout), so <Redirect> is safe here
 * and won't cause the infinite re-render loop that affects layouts.
 */
export default function Index() {
  const auth = useAuthStore();
  const { currentUser, isHydrated } = auth;
  const [splashDone, setSplashDone] = useState(false);

  // #region agent log
  agentLog('B', 'app/index.tsx:Index', 'render', {
    splashDone,
    isHydrated,
    hasUser: Boolean(currentUser),
  });
  // #endregion

  if (!splashDone) {
    return (
      <SplashScreenOverlay
        isHydrated={isHydrated}
        onDone={() => {
          // #region agent log
          agentLog('B', 'app/index.tsx:Index', 'splash onDone', {
            isHydrated,
            hasUser: Boolean(currentUser),
          });
          // #endregion
          setSplashDone(true);
        }}
      />
    );
  }

  if (!currentUser) {
    // #region agent log
    agentLog('C', 'app/index.tsx:Index', 'redirect auth', {});
    // #endregion
    return <Redirect href={'/(auth)' as never} />;
  }

  if (!isOnboardingCompleteForCurrentUser(auth)) {
    // #region agent log
    agentLog('C', 'app/index.tsx:Index', 'redirect onboarding', {});
    // #endregion
    return <Redirect href={'/(onboarding)/q1' as never} />;
  }

  // #region agent log
  agentLog('C', 'app/index.tsx:Index', 'redirect home', {});
  // #endregion
  return <Redirect href={'/(app)/home' as never} />;
}
