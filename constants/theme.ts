import type { BlurTint } from 'expo-blur';
import type { ViewStyle } from 'react-native';

/** Espresso ink — brand chrome, in-app filled buttons, icons (not captions). */
export const BrandTint = '#2C2823' as const;

/**
 * Living terracotta — Home hero, hub primary action, selected segments, paywall.
 * Darkened from #C4622D so `textOnBrand` meets WCAG AA (~4.6:1).
 */
export const BrandAccent = '#B55220' as const;

/**
 * Editorial field: cool bone + ink (light), ink + cream (dark).
 * Surfaces match the canvas — no “cards lighter than page” iOS-Settings mush.
 *
 * WCAG AA (relative luminance, rounded):
 * - #141311 on #F2F1ED ≈ 16:1 — body
 * - #5C5852 on #F2F1ED ≈ 6.2:1 — footnotes
 * - #2C2823 on #F2F1ED ≈ 13:1 — icons / 18pt+
 * - #F8F6F2 on #B55220 ≈ 4.6:1 — accent fills
 * - #F8F6F2 on #2C2823 ≈ 13:1 — in-app FilledButton
 * - #F5F1E8 on #141311 ≈ 15:1 — dark body
 */
const light = {
  background: '#F2F1ED',
  surface: '#F2F1ED',
  surfaceMuted: '#E8E7E3',
  card: '#F2F1ED',
  cardMuted: '#E8E7E3',
  backgroundElevated: '#F2F1ED',
  tintMuted: '#E6E4DF',
  primarySoft: '#E6E4DF',
  text: '#141311',
  textSecondary: '#5C5852',
  textMuted: '#5C5852',
  textSoft: '#8A857C',
  textOnBrand: '#F8F6F2',
  tint: BrandTint,
  primary: BrandTint,
  primaryFill: BrandTint,
  primaryHover: '#3F3932',
  accent: BrandAccent,
  accentSoft: '#E8D0C2',
  brownMid: '#3F3932',
  border: '#D5D3CE',
  borderSoft: '#E0DEDA',
  icon: BrandTint,
  iconMuted: '#7C776F',
  tabIconDefault: '#7C776F',
  tabIconSelected: BrandTint,
  success: '#5C6B4A',
  successSoft: '#E4E6DC',
  error: '#B65C5C',
  danger: '#B65C5C',
  dangerSoft: '#F3DADA',
  warning: '#B9824A',
  warningSoft: '#F2E2D1',
} as const;

const dark = {
  background: '#141311',
  surface: '#1C1B18',
  surfaceMuted: '#181714',
  card: '#1C1B18',
  cardMuted: '#22211E',
  backgroundElevated: '#1C1B18',
  tintMuted: '#2A2723',
  primarySoft: '#2A2723',
  text: '#F5F1E8',
  textSecondary: '#C4BFB6',
  textMuted: '#C4BFB6',
  textSoft: '#9A958C',
  textOnBrand: '#F8F6F2',
  tint: '#C9C0B4',
  primary: '#C9C0B4',
  primaryFill: BrandTint,
  primaryHover: '#D6CEC2',
  accent: BrandAccent,
  accentSoft: '#3D2A20',
  brownMid: '#C9C0B4',
  border: '#2E2C28',
  borderSoft: '#242220',
  icon: '#C9C0B4',
  iconMuted: '#9A958C',
  tabIconDefault: '#9A958C',
  tabIconSelected: '#C9C0B4',
  success: '#A8B07A',
  successSoft: '#2A2C24',
  error: '#D08383',
  danger: '#D08383',
  dangerSoft: '#3D2424',
  warning: '#D2A06A',
  warningSoft: '#3D3224',
} as const;

export const Colors = { light, dark };

/**
 * Calendar occupancy only — open days stay ink on the canvas.
 * Olive = my stay. Terracotta = closed / blocked. Guest fills = who is staying.
 * Amber = pending. Muted red = issues on the day cell, not the legend.
 */
export const CalendarColors = {
  light: {
    myStay: '#5C6B4A',
    booked: BrandAccent,
    bookedFill: '#B5522038',
    bookedBorder: '#B5522088',
    pending: '#B9824A',
    issue: '#B65C5C',
  },
  dark: {
    myStay: '#A8B07A',
    booked: '#D47845',
    bookedFill: '#D4784538',
    bookedBorder: '#D4784588',
    pending: '#D2A06A',
    issue: '#D08383',
  },
} as const;

/** Horizontal padding for screen content (readable line length, touch margins) */
export const Layout = {
  screenPaddingX: 24,
  sectionGap: 28,
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
    surface: 'rgba(242, 241, 237, 0.94)',
    border: 'rgba(20, 19, 17, 0.08)',
    shadow: 'rgba(20, 19, 17, 0.05)',
    tabBar: 'rgba(242, 241, 237, 0.97)',
  },
  dark: {
    surface: 'rgba(28, 27, 24, 0.92)',
    border: 'rgba(245, 241, 232, 0.10)',
    shadow: 'rgba(0, 0, 0, 0.4)',
    tabBar: 'rgba(20, 19, 17, 0.96)',
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
    brandWash: 'rgba(181, 82, 32, 0.03)',
  },
  dark: {
    tint: 'systemChromeMaterialDark',
    intensity: 78,
    brandWash: 'rgba(201, 192, 180, 0.05)',
  },
};

/**
 * One spacing scale. `md` is 16 (not 12). Extra keys (`section`, `screen`, `xxxl`, `pill`)
 * keep `theme/tokens` callers compiling after the merge.
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 48,
  section: 40,
  screen: Layout.screenPaddingX,
} as const;

/**
 * Cards and photo frames use `lg` (22). Buttons stay `md` (14).
 * `xxl` (28) remains for circular wells / large avatars.
 */
export const Radius = {
  xs: 8,
  sm: 10,
  md: 14,
  lg: 22,
  xl: 24,
  xxl: 28,
  full: 9999,
  pill: 9999,
} as const;

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
  pending: '#B9824A',
  approved: '#4A7A5C',
  declined: '#B65C5C',
  alternative_proposed: '#8B5CF6',
  question_asked: '#2E7D91',
  cancelled: '#94A3B8',
  open: '#B9824A',
  in_progress: '#1C3D5A',
  resolved: '#4A7A5C',
} as const;

/** Issue/event priority — shared by home, maintenance, events, issue thread */
export const PriorityColors = {
  low: '#7C776F',
  normal: '#1C3D5A',
  high: '#B9824A',
  urgent: '#B65C5C',
} as const;

export const Fonts = {
  heading: 'Manrope_700Bold',
  headingSemiBold: 'Manrope_600SemiBold',
  body: 'Manrope_400Regular',
  label: 'Inter_500Medium',
  labelBold: 'Inter_700Bold',
};
