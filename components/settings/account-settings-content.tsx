import { Alert, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Layout } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supportMailto } from '@/lib/support';
import { useAuthStore } from '@/store/auth-store';

export function AccountSettingsContent() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const signOut = useAuthStore((s) => s.signOut);
  const currentUser = useAuthStore((s) => s.currentUser);

  function requestDeleteAccount() {
    Alert.alert(
      t('accountSettings.deleteTitle'),
      t('accountSettings.deleteBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.emailSupport'),
          onPress: async () => {
            const subj = t('auth.deleteMailSubject');
            const body = currentUser
              ? t('auth.deleteMailBodyUser', { id: currentUser.id, email: currentUser.email })
              : t('auth.deleteMailBodyGeneric');
            await Linking.openURL(supportMailto(subj, body));
            await signOut();
            router.replace('/(auth)' as never);
          },
        },
      ]
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.inner, { paddingBottom: insets.bottom + 24 }]}>
        <ThemedText style={[styles.copy, { color: colors.icon }]}>{t('accountSettings.copy')}</ThemedText>

        <TouchableOpacity
          style={[styles.dangerBtn, { borderColor: colors.error }]}
          onPress={requestDeleteAccount}
          activeOpacity={0.8}
        >
          <ThemedText style={{ color: colors.error, fontWeight: '700' }}>{t('common.deleteAccount')}</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { paddingHorizontal: Layout.screenPaddingX, paddingTop: 16 },
  copy: { fontSize: 15, lineHeight: 22, marginBottom: 24 },
  dangerBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
});
