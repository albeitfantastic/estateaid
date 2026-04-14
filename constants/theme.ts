import type { BlurTint } from 'expo-blur';
import type { ViewStyle } from 'react-native';

/** Canonical brand from `dsg.md` — light mode primary / interactive */
export const BrandTint = '#2F5D50' as const;

/**
 * App UI — forest + ink + warm stone.
 * Brand tint `dsg.md`. Ink = warm near-black; stone = warm grays for borders/UI chrome.
 */
export const Colors = {
  light: {
    background: '#F4F2ED',
    surface: '#FBF9F6',
    surfaceMuted: '#F0ECE6',
    /** Icon wells — slight sage so brand green still feels native */
    tintMuted: '#E4EFEA',
    /** Warm ink (not pure black, not cold blue-black) */
    text: '#1F1F1B',
    textSecondary: '#6E6A63',
    tint: BrandTint,
    accent: '#C9784A',
    brownMid: '#355F53',
    border: '#D9D0C3',
    icon: '#355F53',
    tabIconDefault: '#7C776F',
    tabIconSelected: BrandTint,
    success: '#5D8A6F',
    error: '#B65C5C',
    warning: '#B9824A',
  },
  dark: {
    background: '#171816',
    surface: '#262A25',
    surfaceMuted: '#232622',
    tintMuted: '#22332D',
    /** Warm paper on ink */
    text: '#F2EEE8',
    textSecondary: '#C6C0B7',
    tint: '#6F9A89',
    accent: '#D69469',
    brownMid: '#8FB2A4',
    border: '#3A3E38',
    icon: '#8FB2A4',
    tabIconDefault: '#A39C92',
    tabIconSelected: '#6F9A89',
    success: '#7DA98D',
    error: '#D08383',
    warning: '#D2A06A',
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

/** Translucent glass surfaces — tab bars, sheets, Android tab fallback */
export const Glass = {
  light: {
    surface: 'rgba(251, 249, 246, 0.94)',
    border: 'rgba(31, 31, 27, 0.09)',
    shadow: 'rgba(31, 31, 27, 0.05)',
    tabBar: 'rgba(251, 249, 246, 0.97)',
  },
  dark: {
    surface: 'rgba(38, 42, 37, 0.92)',
    border: 'rgba(242, 238, 232, 0.10)',
    shadow: 'rgba(0, 0, 0, 0.4)',
    tabBar: 'rgba(38, 42, 37, 0.96)',
  },
};

/**
 * iOS tab bar: `expo-blur` system materials (Liquid Glass–style chrome).
 * Tune `intensity` on a physical device if labels wash out. Android uses `Glass.tabBar` instead (see `TabBarGlassBackground`).
 */
export const TabBarBlur: Record<
  ColorSchemeName,
  { tint: BlurTint; intensity: number; brandWash: string }
> = {
  light: {
    tint: 'systemChromeMaterialLight',
    intensity: 82,
    brandWash: 'rgba(47, 93, 80, 0.035)',
  },
  dark: {
    tint: 'systemChromeMaterialDark',
    intensity: 78,
    brandWash: 'rgba(111, 154, 137, 0.045)',
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
} as const;

export const Fonts = {
  heading: 'Manrope_700Bold',
  headingSemiBold: 'Manrope_600SemiBold',
  body: 'Manrope_400Regular',
  label: 'Inter_500Medium',
  labelBold: 'Inter_700Bold',
};
