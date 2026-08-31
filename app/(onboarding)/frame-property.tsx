import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/paywall/ui/PrimaryButton';
import { useAppTheme } from '@/theme/useAppTheme';

/** Framing before property creation (§5.3). */
export default function FramePropertyScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useAppTheme();

  return (
    <ThemedView style={styles.root}>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('onboarding.frameTitle', { defaultValue: 'Your property, in one calm place' })}
        </Text>
        <Text style={[styles.body, { color: theme.colors.textMuted }]}>
          {t('onboarding.frameBody', {
            defaultValue:
              'Add a name and optional location. You can fill in the rest whenever you are ready.',
          })}
        </Text>
      </View>
      <PrimaryButton
        label={t('onboarding.frameCta', { defaultValue: 'Add your property' })}
        onPress={() => router.push('/(app)/estates/new?fromOnboarding=1' as never)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, justifyContent: 'space-between', paddingBottom: 48 },
  copy: { flex: 1, justifyContent: 'center', gap: 12 },
  title: { fontSize: 28, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24 },
});
