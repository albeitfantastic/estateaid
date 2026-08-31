import { lightColors, darkColors } from './colors';

export const semantic = {
  light: {
    screenBg: lightColors.background,
    panelBg: lightColors.card,
    panelMutedBg: lightColors.surfaceMuted,
    primaryButtonBg: lightColors.primary,
    primaryButtonText: lightColors.textOnBrand,
    secondaryButtonBg: lightColors.primarySoft,
    secondaryButtonText: lightColors.primary,
    inputBg: lightColors.card,
    inputBorder: lightColors.border,
    inputText: lightColors.text,
    inputPlaceholder: lightColors.textSoft,
    successBg: lightColors.successSoft,
    successText: lightColors.success,
    emptyIconBg: lightColors.surfaceMuted,
    emptyIconColor: lightColors.primary,
    tilePrimaryBg: lightColors.primarySoft,
    tileSecondaryBg: lightColors.card,
  },
  dark: {
    screenBg: darkColors.background,
    panelBg: darkColors.card,
    panelMutedBg: darkColors.surfaceMuted,
    primaryButtonBg: darkColors.primary,
    primaryButtonText: darkColors.textOnBrand,
    secondaryButtonBg: darkColors.primarySoft,
    secondaryButtonText: darkColors.primary,
    inputBg: darkColors.card,
    inputBorder: darkColors.border,
    inputText: darkColors.text,
    inputPlaceholder: darkColors.textSoft,
    successBg: darkColors.successSoft,
    successText: darkColors.success,
    emptyIconBg: darkColors.surfaceMuted,
    emptyIconColor: darkColors.primary,
    tilePrimaryBg: darkColors.primarySoft,
    tileSecondaryBg: darkColors.card,
  },
} as const;

export type AppSemantic = typeof semantic.light;
