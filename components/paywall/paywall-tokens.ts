/**
 * Maison paywall design tokens.
 * Deliberately separate from the app's teal palette — Maison uses a warmer,
 * more parchment-and-forest feel for the purchase flow.
 */
export const MC = {
  // Backgrounds (aligned with app warm stone canvas)
  bg: '#F6F4EF',
  surface: '#FFFCF9',

  // Text (warm ink + stone)
  text: '#252220',
  textSecondary: '#6E6862',

  // Brand
  brand: '#234536',   // deep forest green — CTAs, accents, selected states
  tint: '#E8EBE7',    // soft sage-stone — selected card bg, subtle fills

  // Borders
  border: '#DED9D0',
  borderStrong: '#234536',

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
