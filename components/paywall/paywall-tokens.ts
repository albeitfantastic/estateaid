/**
 * Maison paywall design tokens.
 * Canvas and chrome match the app (cream + forest). The subscribe CTA uses
 * `colors.accent` (terracotta) via PrimaryButton — not `MC.brand`.
 */
export const MC = {
  // Backgrounds — same cream canvas as the app
  bg: '#F5F1E8',
  surface: '#FBF8F2',

  // Text (charcoal + stone)
  text: '#1C1B18',
  textSecondary: '#5C5852',

  // Brand chrome — forest green. Terracotta is the subscribe CTA only (`colors.accent`).
  brand: '#1F4D3D',
  tint: '#E3EDE8',

  // Borders
  border: '#DDD4C6',
  borderStrong: '#1F4D3D',

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
