import { Theme, ThemeProvider } from '@react-navigation/native';
import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import {
  Inter_500Medium,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import 'react-native-reanimated';

SplashScreen.preventAutoHideAsync();

import { useColorScheme } from '@/hooks/use-color-scheme';
import { loadAllStores } from '@/lib/load-all-stores';
import { clearPushToken, registerPushToken } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import { SubscriptionProvider } from '@/providers/subscription-provider';

const LightNavTheme: Theme = {
  dark: false,
  colors: {
    primary: '#2C554E',
    background: '#F4F4F2',
    card: '#FFFFFF',
    text: '#1A2B28',
    border: '#DDE1E0',
    notification: '#607D8B',
  },
  fonts: {
    regular: { fontFamily: 'Manrope_400Regular', fontWeight: '400' },
    medium: { fontFamily: 'Manrope_600SemiBold', fontWeight: '600' },
    bold: { fontFamily: 'Manrope_700Bold', fontWeight: '700' },
    heavy: { fontFamily: 'Manrope_700Bold', fontWeight: '900' },
  },
};

const DarkNavTheme: Theme = {
  dark: true,
  colors: {
    primary: '#4A9B8E',
    background: '#0F1F1E',
    card: '#1A2B28',
    text: '#E8F0EE',
    border: '#2E4B48',
    notification: '#607D8B',
  },
  fonts: LightNavTheme.fonts,
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Inter_500Medium,
    Inter_700Bold,
  });

  const colorScheme = useColorScheme();
  const { bootstrapSession, clearUser } = useAuthStore();
  const currentUserId = useAuthStore((s) => s.currentUser?.id);
  const notificationsEnabled = useAuthStore((s) => s.notificationsEnabled);

  useEffect(() => {
    if (!currentUserId) return;
    if (notificationsEnabled) {
      void registerPushToken(currentUserId);
    } else {
      void clearPushToken(currentUserId);
    }
  }, [currentUserId, notificationsEnabled]);

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    let cancelled = false;
    WebBrowser.maybeCompleteAuthSession();

    async function afterSession() {
      if (cancelled) return;
      const user = useAuthStore.getState().currentUser;
      if (user) await loadAllStores();
    }

    void bootstrapSession().then(afterSession);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearUser();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkNavTheme : LightNavTheme}>
      <SubscriptionProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(owner)" />
          <Stack.Screen name="(guest)" />
        </Stack>
        <StatusBar style="auto" />
      </SubscriptionProvider>
    </ThemeProvider>
  );
}
