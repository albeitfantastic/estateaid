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
/** If auth bootstrap never flips isHydrated, leave splash anyway. */
const HYDRATION_FAILSAFE_MS = 3000;

export function SplashScreenOverlay({ isHydrated, onDone }: Props) {
  const [introDone, setIntroDone] = useState(false);
  const rootOpacity = useSharedValue(1);
  const exitStarted = useRef(false);

  const startExit = () => {
    if (exitStarted.current) return;
    exitStarted.current = true;
    rootOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(onDone)();
      }
    });
  };

  useEffect(() => {
    const t = setTimeout(() => setIntroDone(true), INTRO_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!introDone || !isHydrated) return;
    startExit();
  }, [introDone, isHydrated, onDone, rootOpacity]);

  useEffect(() => {
    if (!introDone) return;
    const t = setTimeout(() => {
      if (exitStarted.current) return;
      startExit();
    }, HYDRATION_FAILSAFE_MS);
    return () => clearTimeout(t);
  }, [introDone, isHydrated, onDone, rootOpacity]);

  const rootStyle = useAnimatedStyle(() => ({
    opacity: rootOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, rootStyle, { pointerEvents: 'auto' }]}>
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
