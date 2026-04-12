import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { SplashScreenAnimation } from '@/components/ui/splash-screen-animation';

interface Props {
  isHydrated: boolean;
  onDone: () => void;
}

/** Matches end of intro sequence in `SplashScreenAnimation`. */
const INTRO_MS = 5500;

export function SplashScreenOverlay({ isHydrated, onDone }: Props) {
  const [introDone, setIntroDone] = useState(false);
  const rootOpacity = useSharedValue(1);
  const exitStarted = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setIntroDone(true), INTRO_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!introDone || !isHydrated || exitStarted.current) return;
    exitStarted.current = true;
    rootOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(onDone)();
      }
    });
  }, [introDone, isHydrated, onDone, rootOpacity]);

  const rootStyle = useAnimatedStyle(() => ({
    opacity: rootOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, rootStyle]} pointerEvents="auto">
      <SplashScreenAnimation />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    zIndex: 999,
  },
});
