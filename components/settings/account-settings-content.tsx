import { Alert, Linking, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenScroll, ScreenShell, useScreenTheme } from '@/components/ui/screen-layout';
import { supportMailto } from '@/lib/support';
import { useAuthStore } from '@/store/auth-store';

export function AccountSettingsContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useScreenTheme();
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
    <ScreenShell title={t('settingsScreens.accountTitle')}>
      <ScreenScroll contentContainerStyle={styles.form} gap={16}>
        <ThemedText style={[styles.hint, { color: colors.icon }]}>{t('accountSettings.copy')}</ThemedText>

        <TouchableOpacity
          style={[styles.deleteBtn, { borderColor: colors.error }]}
          onPress={requestDeleteAccount}
          activeOpacity={0.7}
        >
          <IconSymbol name="trash" size={16} color={colors.error} />
          <ThemedText style={{ color: colors.error, fontWeight: '600' }}>
            {t('common.deleteAccount')}
          </ThemedText>
        </TouchableOpacity>
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  form: { paddingTop: 8 },
  hint: { fontSize: 13, lineHeight: 18 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 20,
  },
});
