import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useScreenTheme } from '@/components/ui/screen-layout';
import { trialDaysRemaining } from '@/lib/access-tier-core';
import { APP_TRIAL_DAYS } from '@/lib/subscription-config';
import { useAuthStore } from '@/store/auth-store';
import { useSubscription } from '@/providers/subscription-provider';

/** Quiet home status: “Maison Pro · N days left” (§6.1). Emphasised from day 11. */
export function TrialStatusLine() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const trialEndsAt = useAuthStore((s) => s.currentUser?.trialEndsAt);
  const { slotCount, primaryRow } = useSubscription();
  const days = trialDaysRemaining(trialEndsAt);

  if (days == null) {
    if (slotCount <= 0) return null;
    if (primaryRow) {
      return (
        <Pressable
          onPress={() => router.push('/(app)/settings/subscription' as never)}
          style={styles.row}
        >
          <Text style={[styles.neutral, { color: colors.textSecondary }]}>
            {t('subscriptionSettings.slotsLine', { count: slotCount })}
          </Text>
        </Pressable>
      );
    }
    return null;
  }

  const emphasise = days <= APP_TRIAL_DAYS - 10;
  return (
    <Pressable
      onPress={() => router.push('/(app)/settings/subscription' as never)}
      style={styles.row}
    >
      <Text
        style={
          emphasise
            ? [styles.emph, { color: colors.tint }]
            : [styles.neutral, { color: colors.textSecondary }]
        }
      >
        {t('subscriptionSettings.trialLine', { count: days })}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 6 },
  neutral: { fontSize: 13 },
  emph: { fontSize: 13, fontWeight: '700' },
});
