import { Theme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { loadAllStores } from '@/lib/load-all-stores';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';

const LightNavTheme: Theme = {
  dark: false,
  colors: {
    primary: '#1C3D5A',
    background: '#FAFAF8',
    card: '#FFFFFF',
    text: '#0E1C2D',
    border: '#E5E7EA',
    notification: '#C9A96E',
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '900' },
  },
};

const DarkNavTheme: Theme = {
  dark: true,
  colors: {
    primary: '#C9A96E',
    background: '#0E1C2D',
    card: '#1A2F4E',
    text: '#F0EDE8',
    border: '#2A3F58',
    notification: '#C9A96E',
  },
  fonts: LightNavTheme.fonts,
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { bootstrapSession, clearUser } = useAuthStore();

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
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(owner)" />
        <Stack.Screen name="(guest)" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
