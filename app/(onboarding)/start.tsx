import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/theme/useAppTheme';

/** After quiz: invite code vs add property (§5.2). */
export default function OnboardingStartForkScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useAppTheme();

  return (
    <ThemedView style={styles.root}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {t('onboarding.startForkTitle', { defaultValue: 'How do you want to start?' })}
      </Text>
      <Text style={[styles.sub, { color: theme.colors.textMuted }]}>
        {t('onboarding.startForkSub', {
          defaultValue: 'Join a property you were invited to, or add your own.',
        })}
      </Text>

      <Pressable
        style={[styles.card, { borderColor: theme.colors.border }]}
        onPress={() => router.push('/(app)/stays?redeem=1' as never)}
      >
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          {t('onboarding.haveInviteCode', { defaultValue: 'I have an invite code' })}
        </Text>
        <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>
          {t('onboarding.haveInviteCodeBody', {
            defaultValue: 'Enter the code from your host. No payment required.',
          })}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.card, { borderColor: theme.colors.border }]}
        onPress={() => router.push('/(onboarding)/frame-property' as never)}
      >
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          {t('onboarding.addMyProperty', { defaultValue: 'Add my property' })}
        </Text>
        <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>
          {t('onboarding.addMyPropertyBody', {
            defaultValue: 'Create your first property. Includes a free 14-day trial.',
          })}
        </Text>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  sub: { fontSize: 16, lineHeight: 22, marginBottom: 12 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    gap: 6,
  },
  cardTitle: { fontSize: 18, fontWeight: '600' },
  cardBody: { fontSize: 14, lineHeight: 20 },
});
