import { router } from 'expo-router';
import { create } from 'zustand';

import { agentDebugLog } from '@/lib/agent-debug-log';

type EstateHubIntentState = {
  intentId: string | null;
  fromHome: boolean;
};

export const useEstateHubIntent = create<EstateHubIntentState>(() => ({
  intentId: null,
  fromHome: false,
}));

/** Open a property hub. Home uses `fromHome` so back returns to Home, not a stacked copy. */
export function openEstateHub(estateId: string, opts?: { fromHome?: boolean }) {
  const fromHome = !!opts?.fromHome;
  // #region agent log
  agentDebugLog('C', 'open-estate-hub.ts:openEstateHub', 'openEstateHub', { estateId, fromHome });
  // #endregion
  useEstateHubIntent.setState({ intentId: estateId, fromHome });
  router.navigate(
    {
      pathname: '/(app)/estates/[estateId]',
      params: { estateId },
    } as never,
    { dangerouslySingular: () => 'estate-hub' }
  );
}

export function leaveEstateHub() {
  const fromHome = useEstateHubIntent.getState().fromHome;
  useEstateHubIntent.setState({ intentId: null, fromHome: false });
  // #region agent log
  agentDebugLog('C', 'open-estate-hub.ts:leaveEstateHub', 'leaveEstateHub', { fromHome });
  // #endregion
  if (fromHome) {
    router.navigate('/(app)/home' as never);
    return;
  }
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.navigate('/(app)/estates' as never);
}
