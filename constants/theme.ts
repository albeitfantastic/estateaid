import type { BlurTint } from 'expo-blur';
import type { ViewStyle } from 'react-native';

/** Deep forest green — brand chrome, in-app filled buttons, icons (not captions). */
export const BrandTint = '#1F4D3D' as const;

/**
 * Warm terracotta — paywall / upgrade CTAs only. Darkened from #C4622D so
 * `textOnBrand` (#F8F6F2) meets WCAG AA on the fill (~4.6:1).
 */
export const BrandAccent = '#B55220' as const;

/**
 * WCAG AA (relative luminance, rounded):
 * - #1F4D3D on #F5F1E8 ≈ 8.5:1 — icons / 18pt+ labels, never small body text
 * - #1C1B18 on #F5F1E8 ≈ 15.3:1 — body
 * - #5C5852 on #F5F1E8 ≈ 6.3:1 — footnotes (`textSecondary`)
 * - #F8F6F2 on #B55220 ≈ 4.6:1 — paywall CTA (`#C4622D` failed AA at 3.8:1)
 * - #F8F6F2 on #1F4D3D ≈ 8.9:1 — in-app FilledButton (dark uses `primaryFill`, not sage)
 * - #7BA394 on #121A17 ≈ 6.3:1 — dark selected tab icons
 *
 * Surface strategy: iOS grouped-list — cards sit *lighter* than the canvas.
 * `surface` and `card` are the same elevated paper so GroupedList and SurfaceCard match.
 */
const light = {
  background: '#F5F1E8',
  surface: '#FBF8F2',
  surfaceMuted: '#F0EBE0',
  card: '#FBF8F2',
  cardMuted: '#F0EBE0',
  backgroundElevated: '#FBF8F2',
  /** Icon wells — sage wash of primary, same hue */
  tintMuted: '#E3EDE8',
  primarySoft: '#E3EDE8',
  /** Near-black charcoal, not true black */
  text: '#1C1B18',
  textSecondary: '#5C5852',
  textMuted: '#5C5852',
  textSoft: '#8A857C',
  textOnBrand: '#F8F6F2',
  tint: BrandTint,
  primary: BrandTint,
  /** Solid fill for FilledButton — same as tint in light; never the dark sage icon color */
  primaryFill: BrandTint,
  primaryHover: '#2A5C4A',
  accent: BrandAccent,
  accentSoft: '#E8D0C2',
  brownMid: '#2A5C4A',
  border: '#DDD4C6',
  borderSoft: '#E8DFD2',
  icon: BrandTint,
  iconMuted: '#7C776F',
  tabIconDefault: '#7C776F',
  tabIconSelected: BrandTint,
  success: '#4A7A5C',
  successSoft: '#E3EDE8',
  error: '#B65C5C',
  danger: '#B65C5C',
  dangerSoft: '#F3DADA',
  warning: '#B9824A',
  warningSoft: '#F2E2D1',
} as const;

const dark = {
  background: '#121A17',
  surface: '#1C2622',
  surfaceMuted: '#17201C',
  card: '#1C2622',
  cardMuted: '#24302B',
  backgroundElevated: '#1C2622',
  tintMuted: '#1A2E28',
  primarySoft: '#1A2E28',
  text: '#F2EEE8',
  textSecondary: '#B8C4BE',
  textMuted: '#B8C4BE',
  textSoft: '#8A9A93',
  textOnBrand: '#F8F6F2',
  tint: '#7BA394',
  primary: '#7BA394',
  primaryFill: BrandTint,
  primaryHover: '#8FB5A6',
  accent: BrandAccent,
  accentSoft: '#3D2A20',
  brownMid: '#8FB5A6',
  border: '#2E3C36',
  borderSoft: '#24302B',
  icon: '#8FB5A6',
  iconMuted: '#8A9A93',
  tabIconDefault: '#8A9A93',
  tabIconSelected: '#7BA394',
  success: '#7BA394',
  successSoft: '#1A2E28',
  error: '#D08383',
  danger: '#D08383',
  dangerSoft: '#3D2424',
  warning: '#D2A06A',
  warningSoft: '#3D3224',
} as const;

export const Colors = { light, dark };

/**
 * Calendar / occupancy — functional, not brand chrome.
 * Sage = available (same hue as primary). Terracotta = booked.
 * Amber = pending. Muted red = issues only.
 */
export const CalendarColors = {
  light: {
    available: BrandTint,
    availableFill: '#1F4D3D1F',
    availableBorder: '#1F4D3D66',
    myStay: BrandTint,
    booked: BrandAccent,
    bookedFill: '#B5522038',
    bookedBorder: '#B5522088',
    pending: '#B9824A',
    issue: '#B65C5C',
  },
  dark: {
    available: '#7BA394',
    availableFill: '#7BA39424',
    availableBorder: '#7BA39466',
    myStay: BrandTint,
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
    surface: 'rgba(251, 248, 242, 0.94)',
    border: 'rgba(28, 27, 24, 0.09)',
    shadow: 'rgba(28, 27, 24, 0.05)',
    tabBar: 'rgba(251, 248, 242, 0.97)',
  },
  dark: {
    surface: 'rgba(28, 38, 34, 0.92)',
    border: 'rgba(242, 238, 232, 0.10)',
    shadow: 'rgba(0, 0, 0, 0.4)',
    tabBar: 'rgba(28, 38, 34, 0.96)',
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
    brandWash: 'rgba(31, 77, 61, 0.04)',
  },
  dark: {
    tint: 'systemChromeMaterialDark',
    intensity: 78,
    brandWash: 'rgba(123, 163, 148, 0.05)',
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
 * One radius scale. Cards (GroupedList, SurfaceCard, EstateCard) use `lg` (18).
 * `xxl` (28) remains for circular wells / large avatars, not cards.
 */
export const Radius = {
  xs: 8,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
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
