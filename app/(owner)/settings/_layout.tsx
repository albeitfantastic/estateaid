import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function OwnerSettingsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const { t, i18n } = useTranslation();
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
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="subscription" options={{ title: 'Manage subscription' }} />
      <Stack.Screen name="account" options={{ title: 'Account' }} />
      <Stack.Screen name="language" options={{ title: t('settingsScreens.languageTitle') }} />
      <Stack.Screen name="paywall" options={{ headerShown: false }} />
      <Stack.Screen name="customer-center" options={{ headerShown: false }} />
    </Stack>
  );
}
