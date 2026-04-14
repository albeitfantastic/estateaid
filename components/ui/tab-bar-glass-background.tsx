import { Platform, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

/**
 * Tab bar chrome: native iOS system blur + material tint; warm brand wash on top.
 *
 * Android / web: `expo-blur` is experimental and can jank; we keep the prior rgba
 * `Glass.tabBar` fill (Option A from product plan). To try native blur on Android,
 * add `experimentalBlurMethod="dimezisBlurView"` to BlurView and test on device.
 */
export function TabBarGlassBackground() {
  const t = useAppTheme();

  if (Platform.OS !== 'ios') {
    return <View style={[StyleSheet.absoluteFillObject, { backgroundColor: t.colors.card }]} />;
  }

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: t.colors.card }]} />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: t.colors.primarySoft, opacity: 0.25 }]}
      />
    </View>
  );
}
