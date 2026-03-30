import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: '#EDE8E0',    // warm linen
    surface: '#F5F1EB',       // card surface
    text: '#2A1F18',          // deep espresso
    textSecondary: '#8C7B6E', // muted warm
    tint: '#5C3D2E',          // primary brown
    accent: '#C9A96E',        // warm gold
    brownMid: '#A0785A',      // mid brown — links, secondary accents
    border: '#D4C8BB',        // linen separator
    icon: '#8C7B6E',
    tabIconDefault: '#8C7B6E',
    tabIconSelected: '#5C3D2E',
    success: '#4A7C59',
    error: '#B04A3A',
    warning: '#C48B2C',
  },
  dark: {
    background: '#1A1310',
    surface: '#2A1F18',
    text: '#F0EBE3',
    textSecondary: '#9B8C7E',
    tint: '#C9A96E',
    accent: '#C9A96E',
    brownMid: '#C9A96E',
    border: '#4A3728',
    icon: '#9B8C7E',
    tabIconDefault: '#9B8C7E',
    tabIconSelected: '#C9A96E',
    success: '#4CAF7D',
    error: '#E57373',
    warning: '#FFB74D',
  },
};

export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const Radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 };

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

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
