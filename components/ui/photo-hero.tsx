import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radius } from '@/constants/theme';

const INK = '#141311';
const CREAM = '#F5F1E8';

type PhotoHeroProps = {
  imageUrl?: string | null;
  height?: number;
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Full-bleed (hub header) vs inset card (estate list / Home). */
  edgeToEdge?: boolean;
  /** Home / guest hero can sit as a magazine cover; cards stay start-aligned. */
  align?: 'start' | 'center';
  style?: StyleProp<ViewStyle>;
};

/**
 * Property photo with a bottom ink scrim so cream overlay text stays AA
 * even on a bright sky. Placeholder is an ink wash + house mark.
 */
export function PhotoHero({
  imageUrl,
  height = 240,
  children,
  onPress,
  accessibilityLabel,
  edgeToEdge = false,
  align = 'start',
  style,
}: PhotoHeroProps) {
  const radius = edgeToEdge ? 0 : Radius.lg;
  const centered = align === 'center';

  const body = (
    <View
      style={[
        styles.frame,
        { height, borderRadius: radius, backgroundColor: INK },
        style,
      ]}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.fill} contentFit="cover" />
      ) : (
        <View style={[styles.fill, styles.placeholder, { backgroundColor: INK }]}>
          <IconSymbol name="building.2.fill" size={64} color={CREAM} />
        </View>
      )}
      <LinearGradient
        colors={['rgba(20,19,17,0)', 'rgba(20,19,17,0.70)']}
        locations={[0.28, 1]}
        style={styles.scrim}
      />
      <View style={[styles.overlay, centered && styles.overlayCenter]}>{children}</View>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

export const photoHeroOverlayText = CREAM;

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.92,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 6,
  },
  overlayCenter: {
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
