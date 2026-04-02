import type { ViewStyle } from 'react-native';

/** App UI palette — aligned with `.claude/skills/building-native-ui/design.md` */
export const Colors = {
  light: {
    background: '#F7F5F1',
    surface: '#FFFFFF',
    /** Nested panels, chip wells — warm step between canvas and white cards */
    surfaceMuted: '#F0EDE6',
    text: '#1A2B28',
    textSecondary: '#607D8B',
    tint: '#234536',
    accent: '#607D8B',
    /** Mid tone between brand and secondary — links, subtle emphasis */
    brownMid: '#3E5C54',
    border: '#DDE1E0',
    icon: '#607D8B',
    tabIconDefault: '#607D8B',
    tabIconSelected: '#234536',
    success: '#4A7C59',
    error: '#B04A3A',
    warning: '#C48B2C',
  },
  dark: {
    background: '#0F1F1E',
    surface: '#1A2B28',
    surfaceMuted: '#152420',
    text: '#E8F0EE',
    textSecondary: '#8FA8A3',
    tint: '#4A9B8E',
    accent: '#8FA8A3',
    brownMid: '#4A9B8E',
    border: '#2E4B48',
    icon: '#8FA8A3',
    tabIconDefault: '#8FA8A3',
    tabIconSelected: '#4A9B8E',
    success: '#4CAF7D',
    error: '#E57373',
    warning: '#FFB74D',
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
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 12,
      elevation: 3,
    } satisfies ViewStyle,
    dark: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.45,
      shadowRadius: 14,
      elevation: 5,
    } satisfies ViewStyle,
  },
  row: {
    light: {
      shadowColor: '#1A2B28',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    } satisfies ViewStyle,
    dark: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 3,
    } satisfies ViewStyle,
  },
  fab: {
    light: {
      shadowColor: '#234536',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius: 12,
      elevation: 6,
    } satisfies ViewStyle,
    dark: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 6,
    } satisfies ViewStyle,
  },
} as const;

export type ColorSchemeName = 'light' | 'dark';

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
    surface: 'rgba(255, 253, 250, 0.90)',
    border: 'rgba(60, 60, 67, 0.10)',
    shadow: 'rgba(0, 0, 0, 0.06)',
    tabBar: 'rgba(255, 253, 250, 0.94)',
  },
  dark: {
    surface: 'rgba(26, 43, 40, 0.88)',
    border: 'rgba(255, 255, 255, 0.10)',
    shadow: 'rgba(0, 0, 0, 0.35)',
    tabBar: 'rgba(21, 36, 32, 0.94)',
  },
};

export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
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
