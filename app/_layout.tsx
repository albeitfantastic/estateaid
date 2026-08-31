import {
    Inter_500Medium,
    Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { Theme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { hydrateStoredLanguage, initI18n } from '@/lib/i18n';
import { loadAllStores } from '@/lib/load-all-stores';
import { clearPushToken, registerPushToken, setupNotificationDeepLinkListener } from '@/lib/notifications';
import { maybeSendStayTomorrowReminders } from '@/lib/stay-reminders';
import { supabase } from '@/lib/supabase';
import { SubscriptionProvider } from '@/providers/subscription-provider';
import { UpgradeSheetHost } from '@/lib/maison-pro-upgrade';
import { useAuthStore } from '@/store/auth-store';
import { theme } from '@/theme';

SplashScreen.preventAutoHideAsync();

const LightNavTheme: Theme = {
  dark: false,
  colors: {
    primary: theme.light.colors.primary,
    background: theme.light.colors.background,
    card: theme.light.colors.card,
    text: theme.light.colors.text,
    border: theme.light.colors.border,
    notification: theme.light.colors.textMuted,
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
    primary: theme.dark.colors.primary,
    background: theme.dark.colors.background,
    card: theme.dark.colors.card,
    text: theme.dark.colors.text,
    border: theme.dark.colors.border,
    notification: theme.dark.colors.textMuted,
  },
  fonts: LightNavTheme.fonts,
};

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
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
    return setupNotificationDeepLinkListener();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    void maybeSendStayTomorrowReminders();
  }, [currentUserId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await initI18n();
        await hydrateStoredLanguage();
      } catch {
        /* continue with defaults */
      } finally {
        if (!cancelled) setI18nReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded && i18nReady) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, i18nReady]);

  useEffect(() => {
    let cancelled = false;
    WebBrowser.maybeCompleteAuthSession();

    async function afterSession() {
      if (cancelled) return;
      const user = useAuthStore.getState().currentUser;
      if (user) await loadAllStores();
    }

    void bootstrapSession().then(() => afterSession());

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
          <Stack.Screen name="i/[code]" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
        <UpgradeSheetHost />
        <StatusBar style="auto" />
      </SubscriptionProvider>
    </ThemeProvider>
  );
}
