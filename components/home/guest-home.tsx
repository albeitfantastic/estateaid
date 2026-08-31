import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import {
  FilledButton,
  OutlineButton,
  ScreenScroll,
  SectionHeader,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Layout } from '@/constants/theme';
import { formatDateRange, today } from '@/lib/date-utils';
import type { Estate, Stay } from '@/types';

type Props = {
  estates: Estate[];
  stays: Stay[];
  userId: string;
};

export function GuestHomeBody({ estates, stays, userId }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const todayStr = today();

  const nextStay = useMemo(() => {
    return stays
      .filter((s) => s.guestId === userId && s.to >= todayStr)
      .sort((a, b) => a.from.localeCompare(b.from))[0];
  }, [stays, userId, todayStr]);

  const nextEstate = nextStay
    ? estates.find((e) => e.id === nextStay.estateId)
    : estates[0];

  if (estates.length === 0) {
    return (
      <ScreenScroll contentContainerStyle={styles.scroll}>
        <EmptyState
          icon="ticket.fill"
          title={t('guestHome.emptyTitle')}
          actionLabel={t('guestHome.enterCode')}
          onAction={() => router.push('/(app)/estates/join' as never)}
        />
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll contentContainerStyle={styles.scroll}>
      <SectionHeader title={t('guestHome.nextStay')} />
      {nextStay && nextEstate ? (
        <SurfaceCard variant="elevated" padded style={styles.stayCard}>
          <ThemedText type="defaultSemiBold" style={styles.stayTitle}>
            {nextEstate.name}
          </ThemedText>
          <ThemedText style={{ color: colors.textSecondary }}>
            {formatDateRange(nextStay.from, nextStay.to)}
          </ThemedText>
        </SurfaceCard>
      ) : (
        <EmptyState
          icon="calendar"
          title={t('guestHome.noStayTitle')}
          subtitle={t('guestHome.noStaySub')}
        />
      )}

      {nextEstate ? (
        <View style={styles.actions}>
          <FilledButton
            label={t('guestLanding.requestDates')}
            onPress={() =>
              router.push(`/(app)/stays/plan?estateId=${nextEstate.id}` as never)
            }
          />
          <OutlineButton
            label={t('guestLanding.viewProperty')}
            onPress={() => router.push(`/(app)/estates/${nextEstate.id}` as never)}
          />
        </View>
      ) : null}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: Layout.sectionGap + 12 },
  stayCard: { marginBottom: Layout.sectionGap, gap: 4 },
  stayTitle: { fontSize: 16 },
  actions: { gap: 10, marginTop: 8 },
});
