import { Alert, Linking, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ScreenFootnote, ScreenScroll, ScreenShell, useScreenTheme } from '@/components/ui/screen-layout';
import { Layout, Radius } from '@/constants/theme';
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
    <ScreenShell title="Account">
      <ScreenScroll contentContainerStyle={styles.scroll}>
        <ScreenFootnote>{t('accountSettings.copy')}</ScreenFootnote>

        <TouchableOpacity
          style={[styles.dangerBtn, { borderColor: colors.error }]}
          onPress={requestDeleteAccount}
          activeOpacity={0.8}
        >
          <ThemedText style={{ color: colors.error, fontWeight: '700' }}>{t('common.deleteAccount')}</ThemedText>
        </TouchableOpacity>
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: Layout.sectionGap - 8 },
  dangerBtn: {
    paddingVertical: 16,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 8,
  },
});
