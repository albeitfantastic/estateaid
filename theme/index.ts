import { darkColors, lightColors } from './colors';
import { radius, shadows, spacing, typography } from './tokens';

export const theme = {
  light: {
    colors: lightColors,
    radius,
    spacing,
    typography,
    shadows,
  },
  dark: {
    colors: darkColors,
    radius,
    spacing,
    typography,
    shadows,
  },
} as const;

export type AppTheme = typeof theme.light;

export { lightColors, darkColors } from './colors';
export { radius, spacing, typography, shadows } from './tokens';
export { semantic } from './semantic';
export type { AppColors } from './colors';
export type { AppSemantic } from './semantic';
