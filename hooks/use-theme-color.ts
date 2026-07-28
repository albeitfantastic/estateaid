/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useColorScheme } from '@/hooks/use-color-scheme';
import type { AppColors } from '@/theme';
import { theme } from '@/theme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof AppColors
) {
  const scheme = useColorScheme() ?? 'light';
  const resolved = scheme === 'dark' ? theme.dark : theme.light;
  const colorFromProps = props[scheme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return resolved.colors[colorName];
  }
}
