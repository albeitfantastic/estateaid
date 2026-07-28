export const lightColors = {
  background: '#F4F2ED',
  backgroundElevated: '#F1ECE5',
  surface: '#F1ECE5',
  card: '#F1ECE5',
  cardMuted: '#E6D8C3',
  border: '#D8C7AE',
  borderSoft: '#E6D8C3',

  text: '#1F1F1F',
  textMuted: '#6B6B6B',
  textSoft: '#908A82',
  textOnBrand: '#F8F6F2',

  primary: '#2F5D50',
  primaryHover: '#3F6F61',
  primarySoft: '#E4EFEA',

  accent: '#C9784A',
  accentSoft: '#D9926B',

  success: '#5D8A6F',
  successSoft: '#E4EFE7',
  warning: '#B9824A',
  warningSoft: '#F2E2D1',
  danger: '#B65C5C',
  dangerSoft: '#F3DADA',

  icon: '#2F5D50',
  iconMuted: '#6B6B6B',
} as const;

export const darkColors = {
  background: '#171816',
  backgroundElevated: '#1D1F1C',
  surface: '#232622',
  card: '#262A25',
  cardMuted: '#2D312B',
  border: '#3A3E38',
  borderSoft: '#31352F',

  text: '#F2EEE8',
  textMuted: '#C6C0B7',
  textSoft: '#A39C92',
  textOnBrand: '#F8F6F2',

  primary: '#6F9A89',
  primaryHover: '#80AC9A',
  primarySoft: '#22332D',

  accent: '#D69469',
  accentSoft: '#4B3428',

  success: '#7DA98D',
  successSoft: '#24352D',
  warning: '#D2A06A',
  warningSoft: '#433323',
  danger: '#D08383',
  dangerSoft: '#442A2A',

  icon: '#8FB2A4',
  iconMuted: '#A39C92',
} as const;

export type AppColors = typeof lightColors;
