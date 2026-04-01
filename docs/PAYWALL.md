# Maison Paywall Flow

A 5-screen iOS-first paywall flow. Warm, minimal, premium — no timers, no hype, no urgency.

---

## File Structure

```
components/paywall/
├── paywall-tokens.ts          Maison design tokens (colors, spacing, radius, type scale)
├── paywall-types.ts           Shared TypeScript types (Plan, Testimonial, Benefit…)
├── paywall-mock-data.ts       All copy and mock plan data — swap for real data here
├── paywall-screen.tsx         RevenueCat embedded paywall (existing, updated with onDismiss prop)
│
├── ui/                        Reusable UI atoms — import individually as needed
│   ├── PaywallHeader.tsx      Top bar with optional close button
│   ├── ProofCard.tsx          Quote card (rounded, 1pt border)
│   ├── BenefitRow.tsx         Dot + label row
│   ├── PlanCard.tsx           Selectable plan tile (yearly / monthly)
│   ├── TimelineStep.tsx       Headed step with vertical connector line
│   ├── PrimaryButton.tsx      Full-width 56pt deep green button
│   ├── SecondaryButton.tsx    Muted text-only button
│   ├── LegalLinks.tsx         Privacy Policy · Terms of Service footer
│   └── ExitOfferCard.tsx      Offer card (badge, price, period)
│
└── screens/                   Full screen components — receive callbacks, no router logic
    ├── TrustScreen.tsx        Screen 1 — social proof
    ├── MainPaywallScreen.tsx  Screen 2 — plan selector + benefits
    ├── TrialClarityScreen.tsx Screen 3 — trial timeline
    ├── OutcomeScreen.tsx      Screen 4 — emotional outcome
    └── ExitOfferScreen.tsx    Screen 5 — discounted offer

app/(owner)/settings/
├── paywall-trust.tsx          Route → TrustScreen
├── paywall-main.tsx           Route → MainPaywallScreen
├── paywall-trial.tsx          Route → TrialClarityScreen
├── paywall-outcome.tsx        Route → OutcomeScreen
├── paywall-exit.tsx           Route → ExitOfferScreen
└── paywall.tsx                Route → RevenueCat PaywallScreen (updated)
```

---

## Navigation Flow

```
/(owner)/settings/paywall-trust
  ↓ Continue
/(owner)/settings/paywall-main
  ↓ Start free trial          ✕ Close → paywall-exit (replace)
/(owner)/settings/paywall-trial
  ↓ Continue                  ✕ Close → paywall-exit (replace)
/(owner)/settings/paywall-outcome
  ↓ Start free trial          ✕ Maybe later / Close → paywall-exit (replace)
/(owner)/settings/paywall?fromFlow=true   ← RevenueCat paywall
  ✕ Dismiss → paywall-exit (replace)
/(owner)/settings/paywall-exit
  ↓ Claim offer or Regular pricing → paywall (no fromFlow — dismiss goes home)
```

Back gesture is disabled (`gestureEnabled: false`) on screens 2–5. Each screen provides its own ✕ button that routes to the exit offer.

---

## Triggering the Flow

To start the flow from anywhere in the app:

```typescript
import { useRouter } from 'expo-router';

const router = useRouter();

// Entry point — always starts at Trust
router.push('/(owner)/settings/paywall-trust');
```

To skip straight to the RC paywall (e.g., from a settings "Manage subscription" link):

```typescript
router.push('/(owner)/settings/paywall');
```

---

## Where RevenueCat Plugs In

The flow is fully wired to RevenueCat today via the existing `PaywallScreen` component:

1. **Plan IDs** — Update `RC_PRODUCT_IDS` in `lib/subscription-config.ts` to match your RevenueCat product identifiers
2. **Exit offer discount** — `paywall-exit.tsx` currently routes to the same RC paywall. To apply the 30% discount, pass a promotional offer identifier via `RevenueCatUI.presentPaywall({ offerId: '...' })` or use a separate RC offering for the discounted price
3. **Entitlement** — `PRIMARY_ENTITLEMENT_ID` in `lib/subscription-config.ts` controls the gating key
4. **Supabase mirror** — The existing webhook at `supabase/functions/revenuecat-webhook/` keeps `subscription_entitlements` in sync

---

## Customising Copy

All strings live in `components/paywall/paywall-mock-data.ts`. Edit that file to change any headline, body, plan label, or testimonial — screens read directly from it.

---

## Design Tokens

Maison-specific tokens are in `components/paywall/paywall-tokens.ts` (`MC` object). These are intentionally separate from the app's teal palette to keep the purchase flow visually distinct.

| Token | Value | Usage |
|---|---|---|
| `MC.bg` | `#F7F5F1` | Screen background |
| `MC.brand` | `#234536` | CTAs, selected states, accents |
| `MC.tint` | `#E7EFEA` | Selected card fill |
| `MC.text` | `#1E1E1A` | Primary text |
| `MC.textSecondary` | `#7B7B74` | Body, secondary labels |
| `MC.border` | `#DEDAD2` | Card and input borders |
