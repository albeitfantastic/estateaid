import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { useAppTheme } from '@/theme/useAppTheme';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | 'default'
    | 'title'
    | 'defaultSemiBold'
    | 'subtitle'
    | 'link'
    | 'overline'
    | 'caption'
    | 'statValue'
    | 'statLabel'
    | 'label';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const t = useAppTheme();
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const linkColor = t.colors.primary;
  const tf = t.typography.fontFamily;
  const ts = t.typography.size;
  const lh = t.typography.lineHeight;

  return (
    <Text
      style={[
        { color },
        type === 'default'
          ? { fontSize: ts.md, lineHeight: lh.md, fontFamily: tf.regular, fontWeight: '400' as const }
          : undefined,
        type === 'title'
          ? { fontSize: ts.xxl, lineHeight: lh.xxl, fontFamily: tf.bold, fontWeight: '700' as const }
          : undefined,
        type === 'defaultSemiBold'
          ? { fontSize: ts.md, lineHeight: lh.md, fontFamily: tf.semibold, fontWeight: '600' as const }
          : undefined,
        type === 'subtitle'
          ? { fontSize: ts.xl, lineHeight: lh.xl, fontFamily: tf.bold, fontWeight: '700' as const }
          : undefined,
        type === 'link'
          ? { fontSize: ts.md, lineHeight: lh.md, fontFamily: tf.medium, fontWeight: '500' as const }
          : undefined,
        type === 'link' ? { color: linkColor } : undefined,
        type === 'overline'
          ? {
              fontSize: ts.xs,
              lineHeight: lh.xs,
              fontFamily: tf.bold,
              fontWeight: '700' as const,
              letterSpacing: 1.2,
              textTransform: 'uppercase' as const,
            }
          : undefined,
        type === 'caption'
          ? { fontSize: ts.xs, lineHeight: lh.xs, fontFamily: tf.regular, fontWeight: '400' as const }
          : undefined,
        type === 'statValue'
          ? { fontSize: ts.xl, lineHeight: lh.xl, fontFamily: tf.bold, fontWeight: '700' as const }
          : undefined,
        type === 'statLabel'
          ? {
              fontSize: ts.xs,
              lineHeight: lh.xs,
              fontFamily: tf.medium,
              fontWeight: '500' as const,
              letterSpacing: 0.6,
              textTransform: 'uppercase' as const,
            }
          : undefined,
        type === 'label'
          ? { fontSize: ts.sm, lineHeight: lh.sm, fontFamily: tf.medium, fontWeight: '500' as const }
          : undefined,
        style,
      ]}
      {...rest}
    />
  );
}
const _styles = StyleSheet.create({});
