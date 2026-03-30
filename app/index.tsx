import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { isOnboardingCompleteForCurrentUser, useAuthStore } from '@/store/auth-store';

/**
 * Root index screen — acts as the auth gate.
 * Lives inside the Stack (not the layout), so <Redirect> is safe here
 * and won't cause the infinite re-render loop that affects layouts.
 */
export default function Index() {
  const auth = useAuthStore();
  const { currentUser, isHydrated } = auth;

  // Show spinner while AsyncStorage is rehydrating
  if (!isHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAF8' }}>
        <ActivityIndicator size="large" color="#1C3D5A" />
      </View>
    );
  }

  if (!currentUser) {
    return <Redirect href={'/(auth)' as never} />;
  }

  if (!isOnboardingCompleteForCurrentUser(auth)) {
    return <Redirect href={'/(onboarding)/q1' as never} />;
  }

  if (currentUser.role === 'owner' || currentUser.role === 'admin') {
    return <Redirect href={'/(owner)/home' as never} />;
  }

  return <Redirect href={'/(guest)/home' as never} />;
}
