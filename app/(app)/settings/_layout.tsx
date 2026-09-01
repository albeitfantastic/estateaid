import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useScreenTheme } from '@/components/ui/screen-layout';

export default function SettingsLayout() {
  const { colors } = useScreenTheme();
  const { i18n } = useTranslation();
  return (
    <Stack
      key={i18n.resolvedLanguage}
      initialRouteName="index"
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.tint,
        headerTitleStyle: { fontWeight: '600', color: colors.text },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="subscription" options={{ headerShown: false }} />
      <Stack.Screen name="account" options={{ headerShown: false }} />
      <Stack.Screen name="language" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="calendar" options={{ headerShown: false }} />
      <Stack.Screen name="legal/terms" options={{ headerShown: false }} />
      <Stack.Screen name="legal/privacy" options={{ headerShown: false }} />
      <Stack.Screen name="legal/impressum" options={{ headerShown: false }} />
      <Stack.Screen name="paywall" options={{ headerShown: false }} />
      <Stack.Screen name="customer-center" options={{ headerShown: false }} />
      {/* Maison paywall flow */}
      <Stack.Screen name="paywall-trust" options={{ headerShown: false }} />
      <Stack.Screen name="paywall-outcome" options={{ headerShown: false }} />
      <Stack.Screen name="paywall-exit" options={{ headerShown: false }} />
    </Stack>
  );
}
