import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { Colors, Elevation, Radius, type ColorSchemeName } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SurfaceCardProps = ViewProps & {
  variant?: 'elevated' | 'outline' | 'muted';
  /** Inner padding (default 14). Set false for full-bleed children. */
  padded?: boolean | number;
  accentColor?: string;
  accentWidth?: number;
  contentStyle?: ViewStyle;
};

export function SurfaceCard({
  style,
  variant = 'elevated',
  padded = true,
  accentColor,
  accentWidth = 4,
  contentStyle,
  children,
  ...rest
}: SurfaceCardProps) {
  const scheme = (useColorScheme() ?? 'light') as ColorSchemeName;
  const colors = Colors[scheme];
  const shadow = variant === 'elevated' ? Elevation.card[scheme] : {};
  const pad =
    padded === false ? 0 : typeof padded === 'number' ? padded : 14;

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor:
            variant === 'muted' ? colors.surfaceMuted : colors.surface,
          borderColor: colors.border,
          borderWidth:
            variant === 'outline' || variant === 'elevated'
              ? StyleSheet.hairlineWidth
              : 0,
        },
        variant === 'elevated' && shadow,
        style,
      ]}
      {...rest}
    >
      {accentColor ? (
        <View style={[styles.accent, { width: accentWidth, backgroundColor: accentColor }]} />
      ) : null}
      <View style={[styles.inner, pad ? { padding: pad } : null, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  accent: {
    alignSelf: 'stretch',
  },
  inner: {
    flex: 1,
    minWidth: 0,
  },
});
