export const Colors = {
  light: {
    background: '#F4F4F2',    // neutral light grey
    surface: '#FFFFFF',       // card surface
    text: '#1A2B28',          // dark teal
    textSecondary: '#607D8B', // blue-grey
    tint: '#2C554E',          // primary deep teal
    accent: '#607D8B',        // secondary blue-grey
    brownMid: '#4A7A6E',      // mid teal — links, secondary accents
    border: '#DDE1E0',        // subtle neutral border
    icon: '#607D8B',
    tabIconDefault: '#607D8B',
    tabIconSelected: '#2C554E',
    success: '#4A7C59',
    error: '#B04A3A',
    warning: '#C48B2C',
  },
  dark: {
    background: '#0F1F1E',
    surface: '#1A2B28',
    text: '#E8F0EE',
    textSecondary: '#8FA8A3',
    tint: '#4A9B8E',
    accent: '#607D8B',
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

export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const Radius = { sm: 6, md: 10, lg: 12, xl: 16, full: 9999 };

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
