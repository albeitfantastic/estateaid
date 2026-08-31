import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { trialDaysRemaining } from '@/lib/access-tier-core';
import { APP_TRIAL_DAYS } from '@/lib/subscription-config';
import { useAuthStore } from '@/store/auth-store';
import { useSubscription } from '@/providers/subscription-provider';
import { MC } from '@/components/paywall/paywall-tokens';

/** Quiet home status: “Maison · N days left” (§6.1). Emphasised from day 11. */
export function TrialStatusLine() {
  const router = useRouter();
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
          <Text style={styles.neutral}>Maison · {slotCount} slot{slotCount === 1 ? '' : 's'}</Text>
        </Pressable>
      );
    }
    return null;
  }

  const emphasise = days <= APP_TRIAL_DAYS - 10; // days 11–14 of a 14-day trial
  return (
    <Pressable
      onPress={() => router.push('/(app)/settings/subscription' as never)}
      style={styles.row}
    >
      <Text style={emphasise ? styles.emph : styles.neutral}>
        Maison · {days} day{days === 1 ? '' : 's'} left
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 20, paddingVertical: 6 },
  neutral: { fontSize: 13, color: MC.textSecondary },
  emph: { fontSize: 13, color: MC.brand, fontWeight: '700' },
});
