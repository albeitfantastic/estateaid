/**
 * Maison paywall design tokens.
 * Deliberately separate from the app's teal palette — Maison uses a warmer,
 * more parchment-and-forest feel for the purchase flow.
 */
export const MC = {
  // Backgrounds
  bg: '#F7F5F1',
  surface: '#FFFFFF',

  // Text
  text: '#1E1E1A',
  textSecondary: '#7B7B74',

  // Brand
  brand: '#234536',   // deep forest green — CTAs, accents, selected states
  tint: '#E7EFEA',    // soft sage — selected card bg, subtle fills

  // Borders
  border: '#DEDAD2',
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
