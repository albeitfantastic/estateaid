import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { PhotoHero, photoHeroOverlayText } from '@/components/ui/photo-hero';
import {
  FilledButton,
  OutlineButton,
  ScreenScroll,
} from '@/components/ui/screen-layout';
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
    <ScreenScroll gap={0} contentContainerStyle={styles.scroll}>
      {nextEstate ? (
        <View style={styles.heroBlock}>
          <PhotoHero
            imageUrl={nextEstate.coverImageUrl}
            height={280}
            align="center"
            onPress={() => router.push(`/(app)/estates/${nextEstate.id}` as never)}
            accessibilityLabel={nextEstate.name}
          >
            <ThemedText type="overline" style={styles.heroEyebrow} numberOfLines={1}>
              {nextStay ? t('guestHome.nextStay') : nextEstate.location}
            </ThemedText>
            <ThemedText type="display" style={styles.heroTitle} numberOfLines={2}>
              {nextEstate.name}
            </ThemedText>
            <ThemedText style={styles.heroSub} numberOfLines={2}>
              {nextStay
                ? formatDateRange(nextStay.from, nextStay.to)
                : t('guestHome.noStaySub')}
            </ThemedText>
          </PhotoHero>
          <FilledButton
            tone="accent"
            size="hero"
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
      ) : (
        <EmptyState
          icon="calendar"
          title={t('guestHome.noStayTitle')}
          subtitle={t('guestHome.noStaySub')}
        />
      )}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: Layout.sectionGap + 24 },
  heroBlock: { gap: 16 },
  heroEyebrow: {
    color: photoHeroOverlayText,
    opacity: 0.85,
    textAlign: 'center',
  },
  heroTitle: { color: photoHeroOverlayText, textAlign: 'center' },
  heroSub: {
    color: photoHeroOverlayText,
    fontSize: 15,
    opacity: 0.92,
    textAlign: 'center',
  },
});
