import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PhotoHero, photoHeroOverlayText } from '@/components/ui/photo-hero';
import { useScreenTheme } from '@/components/ui/screen-layout';
import { Layout } from '@/constants/theme';
import { debugLog1393f3 } from '@/lib/debug-session-1393f3';

export type StayHeroPage = {
  id: string;
  imageUrl?: string | null;
  accessibilityLabel: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  onPress: () => void;
};

type Props = {
  pages: StayHeroPage[];
  height?: number;
  onIndexChange?: (index: number) => void;
};

const HERO_HEIGHT = 280;

export function StayHeroPager({ pages, height = HERO_HEIGHT, onIndexChange }: Props) {
  const { colors } = useScreenTheme();
  const listRef = useRef<FlatList<StayHeroPage>>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  const reportIndex = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(next, Math.max(pages.length - 1, 0)));
      setIndex(clamped);
      onIndexChange?.(clamped);
    },
    [onIndexChange, pages.length]
  );
  const reportIndexRef = useRef(reportIndex);
  reportIndexRef.current = reportIndex;

  useEffect(() => {
    if (index >= pages.length) reportIndexRef.current(0);
  }, [index, pages.length]);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (width <= 0) return;
      reportIndexRef.current(Math.round(e.nativeEvent.contentOffset.x / width));
    },
    [width]
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (typeof first?.index === 'number') {
      reportIndexRef.current(first.index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  function scrollTo(i: number) {
    listRef.current?.scrollToIndex({ index: i, animated: true });
    reportIndex(i);
  }

  if (pages.length === 0) return null;

  const singleBranch = pages.length === 1 || width <= 0;

  // #region agent log
  debugLog1393f3({
    hypothesisId: 'B,C,E',
    location: 'components/home/stay-hero-pager.tsx:render',
    message: 'pager render',
    data: {
      pageCount: pages.length,
      uniqueIds: new Set(pages.map((p) => p.id)).size,
      width,
      singleBranch,
      showDots: pages.length > 1,
    },
    runId: 'post-fix',
  });
  // #endregion

  const renderPage = ({ item }: { item: StayHeroPage }) => {
    return (
      <View style={{ width: width || undefined }}>
        <PhotoHero
          imageUrl={item.imageUrl}
          height={height}
          align="center"
          onPress={item.onPress}
          accessibilityLabel={item.accessibilityLabel}
        >
          <ThemedText type="overline" style={styles.heroEyebrow} numberOfLines={1}>
            {item.eyebrow}
          </ThemedText>
          <ThemedText type="display" style={styles.heroTitle} numberOfLines={2}>
            {item.title}
          </ThemedText>
          <ThemedText style={styles.heroSub} numberOfLines={2}>
            {item.subtitle}
          </ThemedText>
        </PhotoHero>
      </View>
    );
  };

  return (
    <View
      onLayout={(e) => {
        const w = Math.round(e.nativeEvent.layout.width);
        const h = Math.round(e.nativeEvent.layout.height);
        // #region agent log
        debugLog1393f3({
          hypothesisId: 'B,C',
          location: 'components/home/stay-hero-pager.tsx:onLayout',
          message: 'pager onLayout',
          data: { w, h, prevWidth: width, pageCount: pages.length },
        });
        // #endregion
        if (w > 0 && w !== width) setWidth(w);
      }}
      accessibilityHint={pages.length > 1 ? 'Swipe left or right for other properties' : undefined}
    >
      {pages.length === 1 || width <= 0 ? (
        renderPage({ item: pages[0]! })
      ) : (
        <FlatList
          ref={listRef}
          data={pages}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          style={{ width, height }}
          key={width}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={onMomentumEnd}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          renderItem={renderPage}
        />
      )}
      {pages.length > 1 ? (
        <View style={styles.dots} accessibilityRole="tablist">
          {pages.map((page, i) => {
            const active = i === index;
            return (
              <Pressable
                key={page.id}
                onPress={() => scrollTo(i)}
                accessibilityRole="button"
                accessibilityLabel={`Property ${i + 1} of ${pages.length}`}
                accessibilityState={{ selected: active }}
                hitSlop={8}
                style={styles.dotHit}
              >
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: active ? colors.tint : colors.tint + '40' },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Layout.touchMin,
    gap: 6,
  },
  dotHit: {
    minWidth: Layout.touchMin,
    minHeight: Layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
