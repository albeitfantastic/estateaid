import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { createSessionFromUrl } from '@/lib/auth-linking';
import { loadAllStores } from '@/lib/load-all-stores';
import { isOnboardingCompleteForCurrentUser, useAuthStore } from '@/store/auth-store';

/**
 * Matches Supabase emailRedirectTo path …/auth/callback so Expo Router does not show
 * "unmatched route". Exchanges the session then sends the user to the home tab.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const url = Linking.useURL();

  useEffect(() => {
    void (async () => {
      const href = url ?? (await Linking.getInitialURL()) ?? '';
      if (href) {
        await createSessionFromUrl(href);
      }
      await useAuthStore.getState().bootstrapSession();
      const state = useAuthStore.getState();
      const user = state.currentUser;
      if (user) {
        await loadAllStores();
        if (!isOnboardingCompleteForCurrentUser(state)) {
          router.replace('/(onboarding)/q1' as never);
        } else {
          router.replace('/(app)/home' as never);
        }
      } else {
        router.replace('/(auth)' as never);
      }
    })();
  }, [router, url]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAF8' }}>
      <ActivityIndicator size="large" color="#1C3D5A" />
    </View>
  );
}
