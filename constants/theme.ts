import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: '#FAFAF8',    // warm off-white
    surface: '#FFFFFF',       // pure white for cards/modals
    text: '#0E1C2D',          // deep navy-black
    textSecondary: '#6B7A8D', // muted blue-gray
    tint: '#1C3D5A',          // deep navy — primary action
    accent: '#C9A96E',        // warm gold — luxury accent
    border: '#E5E7EA',        // subtle separator
    icon: '#6B7A8D',
    tabIconDefault: '#6B7A8D',
    tabIconSelected: '#1C3D5A',
    success: '#2D7D52',
    error: '#C0392B',
    warning: '#D97706',
  },
  dark: {
    background: '#0E1C2D',
    surface: '#1A2F4E',
    text: '#F0EDE8',
    textSecondary: '#9BAAB8',
    tint: '#C9A96E',
    accent: '#C9A96E',
    border: '#2A3F58',
    icon: '#9BAAB8',
    tabIconDefault: '#9BAAB8',
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
