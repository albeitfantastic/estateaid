import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { StayHeroPager, type StayHeroPage } from '@/components/home/stay-hero-pager';
import { EmptyState } from '@/components/ui/empty-state';
import {
  FilledButton,
  OutlineButton,
  ScreenScroll,
} from '@/components/ui/screen-layout';
import { Layout } from '@/constants/theme';
import { formatDateRange, today } from '@/lib/date-utils';
import { openEstateHub } from '@/lib/open-estate-hub';
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
  const [propertyIndex, setPropertyIndex] = useState(0);

  const propertyHeroes = useMemo(() => {
    const myStays = stays
      .filter((s) => s.guestId === userId && s.to >= todayStr)
      .sort((a, b) => {
        const aActive = a.from <= todayStr && a.to >= todayStr;
        const bActive = b.from <= todayStr && b.to >= todayStr;
        if (aActive !== bActive) return aActive ? -1 : 1;
        return a.from.localeCompare(b.from);
      });
    const nextStayByEstate = new Map<string, Stay>();
    for (const stay of myStays) {
      if (!nextStayByEstate.has(stay.estateId)) nextStayByEstate.set(stay.estateId, stay);
    }

    return [...estates]
      .sort((a, b) => {
        const sa = nextStayByEstate.get(a.id);
        const sb = nextStayByEstate.get(b.id);
        const aActive = sa ? (sa.from <= todayStr && sa.to >= todayStr ? 0 : 1) : 2;
        const bActive = sb ? (sb.from <= todayStr && sb.to >= todayStr ? 0 : 1) : 2;
        if (aActive !== bActive) return aActive - bActive;
        if (sa && sb) return sa.from.localeCompare(sb.from);
        return a.name.localeCompare(b.name);
      })
      .map((estate) => ({
        estate,
        nextStay: nextStayByEstate.get(estate.id),
      }));
  }, [estates, stays, userId, todayStr]);

  const stayPages = useMemo((): StayHeroPage[] => {
    return propertyHeroes.map((h) => {
      const stay = h.nextStay;
      return {
        id: h.estate.id,
        imageUrl: h.estate.coverImageUrl,
        accessibilityLabel: h.estate.name,
        eyebrow: t('guestHome.nextStay'),
        title: h.estate.name,
        subtitle: stay ? formatDateRange(stay.from, stay.to) : t('ownerHome.noStayOnProperty'),
        onPress: () => openEstateHub(h.estate.id, { fromHome: true }),
      };
    });
  }, [propertyHeroes, router, t]);

  const visibleHero =
    propertyHeroes[Math.min(propertyIndex, Math.max(propertyHeroes.length - 1, 0))];
  const visibleStay = visibleHero?.nextStay;
  const visibleEstate = visibleHero?.estate;

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

  if (!visibleEstate) {
    return (
      <ScreenScroll contentContainerStyle={styles.scroll}>
        <EmptyState
          icon="calendar"
          title={t('guestHome.noStayTitle')}
          subtitle={t('guestHome.noStaySub')}
        />
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll gap={0} contentContainerStyle={styles.scroll}>
      <View style={styles.heroBlock}>
        <StayHeroPager pages={stayPages} onIndexChange={setPropertyIndex} />
        {visibleStay ? (
          <>
            <FilledButton
              tone="accent"
              size="hero"
              label={t('ownerHome.viewStay')}
              onPress={() => router.push(`/(app)/stays/${visibleStay.id}` as never)}
            />
            <OutlineButton
              label={t('guestLanding.requestDates')}
              onPress={() =>
                router.push(`/(app)/stays/plan?estateId=${visibleEstate.id}` as never)
              }
            />
          </>
        ) : (
          <FilledButton
            tone="accent"
            size="hero"
            label={t('guestLanding.requestDates')}
            onPress={() =>
              router.push(`/(app)/stays/plan?estateId=${visibleEstate.id}` as never)
            }
          />
        )}
        <OutlineButton
          label={t('guestLanding.viewProperty')}
          onPress={() => openEstateHub(visibleEstate.id, { fromHome: true })}
        />
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: Layout.sectionGap + 24 },
  heroBlock: { gap: 16 },
});
