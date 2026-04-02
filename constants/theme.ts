import type { ViewStyle } from 'react-native';

/** Canonical brand from `dsg.md` — light mode primary / interactive */
export const BrandTint = '#234536' as const;

/**
 * App UI — forest + ink + warm stone.
 * Brand tint `dsg.md`. Ink = warm near-black; stone = warm grays for borders/UI chrome.
 */
export const Colors = {
  light: {
    background: '#F6F4EF',
    surface: '#FFFCF9',
    surfaceMuted: '#EFEBE3',
    /** Icon wells — slight sage so brand green still feels native */
    tintMuted: '#E8EBE7',
    /** Warm ink (not pure black, not cold blue-black) */
    text: '#252220',
    textSecondary: '#6E6862',
    tint: BrandTint,
    accent: '#6E6862',
    brownMid: '#3D4A44',
    border: '#DED9D0',
    icon: '#6E6862',
    tabIconDefault: '#6E6862',
    tabIconSelected: BrandTint,
    success: '#4A7C59',
    error: '#B04A3A',
    warning: '#B8923A',
  },
  dark: {
    background: '#131210',
    surface: '#1F1D1A',
    surfaceMuted: '#262422',
    tintMuted: '#2C302E',
    /** Warm paper on ink */
    text: '#F4F1EB',
    textSecondary: '#9C9690',
    tint: '#5CB0A0',
    accent: '#9C9690',
    brownMid: '#6A9086',
    border: '#3A3632',
    icon: '#9C9690',
    tabIconDefault: '#9C9690',
    tabIconSelected: '#5CB0A0',
    success: '#4CAF7D',
    error: '#E57373',
    warning: '#D4A84B',
  },
};

/** Horizontal padding for screen content (readable line length, touch margins) */
export const Layout = {
  screenPaddingX: 24,
  sectionGap: 20,
  touchMin: 44,
} as const;

/** Card / floating shadow presets — use with backgroundColor: colors.surface */
export const Elevation = {
  card: {
    light: {
      shadowColor: '#1A2B28',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 20,
      elevation: 4,
    } satisfies ViewStyle,
    dark: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 6,
    } satisfies ViewStyle,
  },
  row: {
    light: {
      shadowColor: '#252220',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    } satisfies ViewStyle,
    dark: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.32,
      shadowRadius: 10,
      elevation: 3,
    } satisfies ViewStyle,
  },
  fab: {
    light: {
      shadowColor: BrandTint,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 8,
    } satisfies ViewStyle,
    dark: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.45,
      shadowRadius: 14,
      elevation: 8,
    } satisfies ViewStyle,
  },
} as const;

export type ColorSchemeName = 'light' | 'dark';

/** Resolved palette for the active scheme (used by sheets, cards, etc.) */
export type ThemeColors = (typeof Colors)[ColorSchemeName];

export function elevationStyle(
  level: keyof typeof Elevation,
  scheme: ColorSchemeName | null | undefined
): ViewStyle {
  const s = scheme ?? 'light';
  return Elevation[level][s];
}

/** Translucent glass surfaces — tab bars, sheets */
export const Glass = {
  light: {
    surface: 'rgba(255, 252, 249, 0.94)',
    border: 'rgba(37, 34, 32, 0.09)',
    shadow: 'rgba(37, 34, 32, 0.05)',
    tabBar: 'rgba(255, 252, 249, 0.97)',
  },
  dark: {
    surface: 'rgba(31, 29, 26, 0.92)',
    border: 'rgba(244, 241, 235, 0.10)',
    shadow: 'rgba(0, 0, 0, 0.4)',
    tabBar: 'rgba(31, 29, 26, 0.96)',
  },
};

export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const Radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  full: 9999,
};

/** Distinct colors for estates on the calendar (up to 8 estates) */
export const EstateColors = [
  '#1C3D5A', // navy
  '#B5703A', // cognac
  '#4A7A5C', // sage
  '#8B5CF6', // violet
  '#C0392B', // crimson
  '#C9A96E', // gold
  '#2E7D91', // teal
  '#64748B', // slate
] as const;

/** Semantic colors for stay/ticket statuses */
export const StatusColors = {
  pending: '#D97706',
  approved: '#2D7D52',
  declined: '#C0392B',
  alternative_proposed: '#8B5CF6',
  question_asked: '#2E7D91',
  cancelled: '#94A3B8',
  open: '#D97706',
  in_progress: '#1C3D5A',
  resolved: '#2D7D52',
  closed: '#94A3B8',
} as const;

export const Fonts = {
  heading: 'Manrope_700Bold',
  headingSemiBold: 'Manrope_600SemiBold',
  body: 'Manrope_400Regular',
  label: 'Inter_500Medium',
  labelBold: 'Inter_700Bold',
};
