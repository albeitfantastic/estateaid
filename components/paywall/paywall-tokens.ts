/**
 * Maison paywall design tokens.
 * Canvas and chrome match the app (cool bone + espresso). The subscribe CTA uses
 * `colors.accent` (terracotta) via PrimaryButton — not `MC.brand`.
 */
export const MC = {
  bg: '#F2F1ED',
  surface: '#F2F1ED',

  text: '#141311',
  textSecondary: '#5C5852',

  brand: '#2C2823',
  tint: '#E6E4DF',

  border: '#D5D3CE',
  borderStrong: '#2C2823',

  // Spacing
  hPad: 24,
  sectionGap: 24,
  cardGap: 12,
  titleBodyGap: 12,
  aboveCta: 24,

  // Shape
  cardRadius: 18,
  buttonRadius: 18,

  // Typography
  largeTitle: 34,
  sectionTitle: 28,
  body: 17,
  secondary: 15,
  buttonLabel: 17,
} as const;
