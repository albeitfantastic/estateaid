import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Fonts } from '@/constants/theme';
import { Typography } from '@/constants/typography';

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
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const scheme = useColorScheme();
  const linkColor = Colors[scheme ?? 'light'].brownMid;

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'link' ? { color: linkColor } : undefined,
        type === 'overline' ? styles.overline : undefined,
        type === 'caption' ? styles.caption : undefined,
        type === 'statValue' ? styles.statValue : undefined,
        type === 'statLabel' ? styles.statLabel : undefined,
        type === 'label' ? styles.label : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    ...Typography.body,
  },
  defaultSemiBold: {
    ...Typography.bodySemiBold,
  },
  title: {
    ...Typography.hero,
  },
  subtitle: {
    ...Typography.subtitle,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Fonts.body,
  },
  overline: {
    ...Typography.overline,
  },
  caption: {
    ...Typography.caption,
  },
  statValue: {
    ...Typography.statValue,
  },
  statLabel: {
    ...Typography.statLabel,
  },
  label: {
    ...Typography.label,
  },
});
