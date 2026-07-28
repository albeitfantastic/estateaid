import { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { enCatalog } from '@/lib/i18n/catalog/bundle';

const { width, height } = Dimensions.get('window');

const BG = '#F6F0E8';
const GREEN = '#2D4A2D';
const GREEN_MUTED = 'rgba(45, 74, 45, 0.18)';
const GREEN_FAINT = 'rgba(45, 74, 45, 0.15)';

const ICON_SIZE = 160;
/** Raster of `logo_green.svg` (4960×3840 viewBox) — PNG avoids `RNSVGSvgView` when native SVG is absent. */
const LOGO_W = ICON_SIZE * 0.62;
const LOGO_H = LOGO_W * (3840 / 4960);

const AnimatedImage = Animated.createAnimatedComponent(Image);

function getSplashCopy() {
  const common = enCatalog.common as Record<string, string> | undefined;
  const splash = enCatalog.splash as Record<string, string> | undefined;
  return {
    brand: common?.estateAid ?? 'Maison',
    tagline: splash?.tagline ?? 'Your property, managed',
  };
}

function SmokePuff({ delay, size }: { delay: number; size: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once; delay captured
  }, [delay]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.15, 0.8, 1], [0, 0.55, 0.3, 0], Extrapolate.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -32], Extrapolate.CLAMP) },
      { translateX: interpolate(progress.value, [0, 1], [0, -6], Extrapolate.CLAMP) },
      { scale: interpolate(progress.value, [0, 1], [0.3, 1.4], Extrapolate.CLAMP) },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: GREEN_MUTED,
        },
        style,
      ]}
    />
  );
}

function Particle({
  x,
  y,
  size,
  delay,
  duration,
}: {
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, false)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, [delay, duration]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.2, 0.8, 1], [0, 0.12, 0.08, 0], Extrapolate.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -80], Extrapolate.CLAMP) },
      { scale: interpolate(progress.value, [0, 0.2, 1], [0, 1, 0.5], Extrapolate.CLAMP) },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: GREEN,
        },
        style,
      ]}
    />
  );
}

function Sparkle({ x, y, angle, delay }: { x: number; y: number; angle: number; delay: number }) {
  const progress = useSharedValue(0);
  const dist = 18;

  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1)) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, [delay]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.3, 1], [0, 0.9, 0], Extrapolate.CLAMP),
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [0, Math.cos(angle) * dist], Extrapolate.CLAMP) },
      { translateY: interpolate(progress.value, [0, 1], [0, Math.sin(angle) * dist], Extrapolate.CLAMP) },
      { scale: interpolate(progress.value, [0, 0.4, 1], [0, 1, 0], Extrapolate.CLAMP) },
      {
        rotate: `${interpolate(progress.value, [0, 1], [0, 45], Extrapolate.CLAMP)}deg`,
      },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: 6,
          height: 6,
          borderRadius: 1,
          backgroundColor: GREEN,
        },
        style,
      ]}
    />
  );
}

function makeDotStyle(sv: SharedValue<number>) {
  return useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(sv.value, [0, 1], [1, 1.6], Extrapolate.CLAMP) }],
    opacity: interpolate(sv.value, [0, 1], [0.25, 0.7], Extrapolate.CLAMP),
  }));
}

/**
 * Full-bleed splash: green mark from `assets/images/logo_green.png` on a transparent tile (splash BG shows through).
 * Uses `Animated.Image` so no `react-native-svg` native module is required. Copy from `enCatalog` so strings resolve before i18n init.
 */
export function SplashScreenAnimation() {
  const { brand, tagline } = getSplashCopy();

  const cardScale = useSharedValue(0.4);
  const cardRotate = useSharedValue(-8);
  const cardOpacity = useSharedValue(0);

  const logoOpacity = useSharedValue(0);

  const brandOpacity = useSharedValue(0);
  const brandTranslateY = useSharedValue(16);

  const progressWrapOpacity = useSharedValue(0);
  const progressWidth = useSharedValue(0);

  const dotsOpacity = useSharedValue(0);

  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const E = Easing.out(Easing.cubic);

    cardOpacity.value = withDelay(100, withTiming(1, { duration: 100 }));
    cardScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 150 }));
    cardRotate.value = withDelay(100, withSpring(0, { damping: 14, stiffness: 140 }));

    logoOpacity.value = withDelay(700, withTiming(1, { duration: 650, easing: E }));

    brandOpacity.value = withDelay(2800, withTiming(1, { duration: 700, easing: E }));
    brandTranslateY.value = withDelay(2800, withTiming(0, { duration: 700, easing: E }));

    progressWrapOpacity.value = withDelay(3200, withTiming(1, { duration: 500, easing: E }));
    progressWidth.value = withDelay(3400, withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.cubic) }));

    dotsOpacity.value = withDelay(3400, withTiming(1, { duration: 500, easing: E }));
    const dotPulse = withRepeat(
      withSequence(withTiming(1, { duration: 400 }), withTiming(0, { duration: 400 })),
      -1,
      false
    );
    dot1.value = withDelay(3600, dotPulse);
    dot2.value = withDelay(3750, dotPulse);
    dot3.value = withDelay(3900, dotPulse);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- orchestrate once on mount
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }, { rotate: `${cardRotate.value}deg` }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
  }));

  const brandStyle = useAnimatedStyle(() => ({
    opacity: brandOpacity.value,
    transform: [{ translateY: brandTranslateY.value }],
  }));

  const progressWrapStyle = useAnimatedStyle(() => ({
    opacity: progressWrapOpacity.value,
  }));

  const progressFillStyle = useAnimatedStyle(() => ({
    width: interpolate(progressWidth.value, [0, 1], [0, 80], Extrapolate.CLAMP),
  }));

  const dotsWrapStyle = useAnimatedStyle(() => ({
    opacity: dotsOpacity.value,
  }));

  const dot1Style = makeDotStyle(dot1);
  const dot2Style = makeDotStyle(dot2);
  const dot3Style = makeDotStyle(dot3);

  const particles = Array.from({ length: 14 }, (_, i) => ({
    x: 20 + ((i * 37) % (width - 40)),
    y: 120 + ((i * 53) % (height * 0.5)),
    size: 3 + (i % 3) * 2,
    delay: (i * 280) % 3500,
    duration: 3000 + ((i * 400) % 2000),
  }));

  const sparkles = [
    { x: -14, y: -10, angle: -2.5 },
    { x: ICON_SIZE - 6, y: -8, angle: -0.5 },
    { x: ICON_SIZE + 2, y: 60, angle: 0.3 },
    { x: -16, y: 75, angle: Math.PI + 0.3 },
    { x: 60, y: -16, angle: -1.5 },
    { x: 100, y: ICON_SIZE - 2, angle: 1.2 },
  ];

  return (
    <View style={styles.container}>
      {particles.map((p, i) => (
        <Particle key={i} {...p} />
      ))}

      <View style={styles.centerGroup}>
        <Animated.View style={[styles.cardWrap, cardStyle]}>
          {sparkles.map((s, i) => (
            <Sparkle key={i} x={s.x} y={s.y} angle={s.angle} delay={2400 + i * 60} />
          ))}

          <View style={styles.card}>
            <AnimatedImage
              source={require('../../assets/images/logo_green.png')}
              style={[styles.logoWrap, logoStyle]}
              resizeMode="contain"
            />
          </View>

          <View style={styles.smokeContainer}>
            <SmokePuff delay={2600} size={10} />
            <SmokePuff delay={3000} size={7} />
            <SmokePuff delay={3400} size={8} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.brandWrap, brandStyle]}>
          <Text style={styles.brandName}>{brand}</Text>
          <Text style={styles.brandTagline}>{tagline}</Text>
        </Animated.View>

        <Animated.View style={[styles.progressWrap, progressWrapStyle]}>
          <Animated.View style={[styles.progressFill, progressFillStyle]} />
        </Animated.View>

        <Animated.View style={[styles.dotsRow, dotsWrapStyle]}>
          <Animated.View style={[styles.dot, dot1Style]} />
          <Animated.View style={[styles.dot, dot2Style]} />
          <Animated.View style={[styles.dot, dot3Style]} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerGroup: {
    alignItems: 'center',
  },
  cardWrap: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    position: 'relative',
  },
  card: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    backgroundColor: 'transparent',
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  logoWrap: {
    width: LOGO_W,
    height: LOGO_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smokeContainer: {
    position: 'absolute',
    top: 20,
    right: 36,
    width: 14,
    height: 14,
  },
  brandWrap: {
    marginTop: 28,
    alignItems: 'center',
  },
  brandName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 30,
    fontWeight: '600',
    color: GREEN,
    letterSpacing: 1.5,
  },
  brandTagline: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(45, 74, 45, 0.55)',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  progressWrap: {
    marginTop: 36,
    width: 80,
    height: 2,
    backgroundColor: GREEN_FAINT,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: GREEN,
    borderRadius: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(45, 74, 45, 0.3)',
  },
});
