import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useScreenTheme } from '@/components/ui/screen-layout';
import { Layout } from '@/constants/theme';
import { trialDaysRemaining } from '@/lib/access-tier-core';
import { useAccountContext } from '@/lib/entitlements/capabilities';
import { APP_TRIAL_DAYS } from '@/lib/subscription-config';
import { useSubscription } from '@/providers/subscription-provider';

/** Quiet home status: trial days + used/available slots. Emphasised from day 11. */
export function TrialStatusLine() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const { slotCount, primaryRow } = useSubscription();
  const { propertiesSponsored, trialEndsAt } = useAccountContext();
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
            {t('subscriptionSettings.slotsLineUsage', {
              used: propertiesSponsored,
              total: slotCount,
            })}
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
        {t('subscriptionSettings.trialLineWithSlots', {
          count: days,
          used: propertiesSponsored,
          total: slotCount,
        })}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 2, minHeight: Layout.touchMin, justifyContent: 'center' },
  neutral: { fontSize: 13 },
  emph: { fontSize: 13, fontWeight: '700' },
});
