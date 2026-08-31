# Maison Paywall Flow

Intent-triggered soft pitch → **RevenueCat** (subscribe / slot packs) → post-purchase **rating** (once). Warm, minimal, premium — no fake discounts, no timers.

## Slot packs (§2)

What is sold is **property slots**, not a feature tier. Three packs in one App Store subscription group:

| Pack | Slots | Annual | Monthly | Per-property/year pitch |
|------|-------|--------|---------|-------------------------|
| Home | 1 | €59.99 | €6.99 | ~€60 |
| Family | 3 | €99.99 | €10.99 | ~€33 |
| Portfolio | 10 | €199.99 | €19.99 | ~€20 |

RevenueCat resolves the active product to an integer `slotCount` (1 / 3 / 10). Creating a property consumes one free slot (`sponsorUserId` = creator). Above 10 is not sold — contact for a manual grant.

## Create-only paywall trigger (§8)

The paywall opens from **one condition**:

> A user attempts to **create a property** with no free slot.

| Condition | Behaviour |
|-----------|-----------|
| `hasUsedTrial === false` | Grant 14-day trial, no paywall, open creation form |
| `hasUsedTrial === true`, no free slot | Paywall (Home / Family / Portfolio) |

Everything else is **coverage** on the property (reads stay open; writes lock when uncovered). Do not pitch on invite / upload / approve / availability — those are covered-property gates, not sales moments.

Onboarding does **not** open the paywall. Soft pitch screens (`paywall-trust` → `paywall-outcome`) are reached only from the create-estate path (`openEstateCreatePaywall` / upgrade sheet → Choose a plan).

**Estate-scoped coverage:** host tools follow the estate’s **sponsor** slot, not each host’s personal purchases. Never open the upgrade sheet when a host hits a lapsed sponsor — show the named lapse + transfer UI instead (`SponsorCoverageBanner`).

---

## File Structure

```
lib/entitlements/capabilities.ts   can() / useCan() — single gate
lib/entitlements/host-gate.ts      upgrade vs sponsor_lapsed routing
lib/maison-pro-upgrade.tsx         Upgrade bottom sheet → paywall-trust
store/estate-coverage-store.ts     covered / sponsor name / role cache
```

---

## Navigation Flow

```
Create property, no free slot, trial already used
  → upgrade sheet → paywall-trust?source=&returnTo=
  ↓ Continue
/(app)/settings/paywall-outcome → RC packages (Home/Family/Portfolio)

Sponsor lapsed (you are host, not sponsor; invite role `owner`)
  → SponsorCoverageBanner → Take over sponsorship | Upgrade to take over
  (no generic pitch for the lapse itself)
```

---

## Regression checklist (slots)

- [ ] New signup → Add my property → trial granted → writable, no paywall
- [ ] Invite redeem → no trial, lands in property
- [ ] Trial used, no free slot → create shows paywall with three packs
- [ ] Delete property → slot frees for reuse (no second trial)
- [ ] Host on covered estate: full write; cannot invite hosts / delete / transfer
- [ ] Sponsor lapse: all sponsored properties read-only; named message + transfer
- [ ] Downgrade Family → Home with 3 properties: all locked until sponsor chooses 1

---

## Expo Go / no RC key

Outcome can still call `startAppTrialRpc` when RevenueCat is unavailable (fallback only).
