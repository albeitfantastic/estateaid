import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, View, type ViewProps } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

const LIGHT_PAPER: [string, string, string] = [
  'rgba(230, 216, 195, 0.06)',
  'rgba(245, 241, 232, 0.00)',
  'rgba(230, 216, 195, 0.04)',
];
const DARK_PAPER: [string, string, string] = [
  'rgba(28, 38, 34, 0.14)',
  'rgba(18, 26, 23, 0.00)',
  'rgba(28, 38, 34, 0.10)',
];
const LIGHT_VIGNETTE: [string, string, string] = [
  'rgba(31, 77, 61, 0.03)',
  'rgba(31, 77, 61, 0.00)',
  'rgba(31, 77, 61, 0.03)',
];
const DARK_VIGNETTE: [string, string, string] = [
  'rgba(123, 163, 148, 0.05)',
  'rgba(123, 163, 148, 0.00)',
  'rgba(123, 163, 148, 0.06)',
];

export function ThemedView({ style, lightColor, darkColor, children, ...otherProps }: ThemedViewProps) {
  const t = useAppTheme();
  const isDark = t.scheme === 'dark';
  const backgroundColor = (isDark ? darkColor : lightColor) ?? t.colors.background;

  return (
    <View style={[{ backgroundColor }, style]} {...otherProps}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image
          source={require('@/assets/images/noise.png.png')}
          style={[StyleSheet.absoluteFill, { opacity: isDark ? 0.04 : 0.03 }]}
          resizeMode="cover"
        />
        <LinearGradient
          colors={isDark ? DARK_PAPER : LIGHT_PAPER}
          start={{ x: 0.15, y: 0.05 }}
          end={{ x: 0.85, y: 0.95 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={isDark ? DARK_VIGNETTE : LIGHT_VIGNETTE}
          start={{ x: 0.5, y: 0.0 }}
          end={{ x: 0.5, y: 1.0 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      {children}
    </View>
  );
}
