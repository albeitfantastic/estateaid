/**
 * In-app legal surfaces (spec §17). Public `/legal/*` routes are reachable
 * signed-out (auth footnote, paywall) as well as from Settings.
 */
export const LEGAL_ROUTES = {
  terms: '/legal/terms',
  privacy: '/legal/privacy',
  impressum: '/legal/impressum',
} as const;

export type LegalRouteKey = keyof typeof LEGAL_ROUTES;
