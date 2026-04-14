export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
  screen: 24,
} as const;

export const typography = {
  fontFamily: {
    regular: 'Manrope_400Regular',
    medium: 'Manrope_400Regular',
    semibold: 'Manrope_600SemiBold',
    bold: 'Manrope_700Bold',
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    hero: 40,
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    md: 22,
    lg: 24,
    xl: 30,
    xxl: 36,
    hero: 46,
  },
} as const;

export const shadows = {
  none: {
    shadowColor: 'transparent' as const,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
} as const;
