# Maison Paywall Flow

Intent-triggered soft pitch → **RevenueCat** (subscribe / slot packs) → post-purchase **rating** (once). Warm, minimal, premium — no fake discounts, no timers.

## Slot packs (§2)

What is sold is **property slots**, not a feature tier. Three packs in one App Store subscription group:

| Pack | Slots | Annual | Monthly | Per-property/year pitch |
|------|-------|--------|---------|-------------------------|
| Résidence | 1 | €149.99 | €14.99 | €150 |
| Domaine | 3 | €299.99 | €29.99 | €100 |
| Héritage | 7 | €499.99 | €49.99 | €71 |

RevenueCat resolves the active product to an integer `slotCount` (1 / 3 / 7). Creating a property consumes one free slot (`sponsorUserId` = creator). Above 7 is not sold — contact for a manual grant.

## Create-only paywall trigger (§8)

The paywall opens from **one condition**:

> A user attempts to **create a property** with no free slot.

| Condition | Behaviour |
|-----------|-----------|
| No free slot | Paywall (Résidence / Domaine / Héritage) — 14-day store intro on the selected SKU, then auto-renew |

Everything else is **coverage** on the property (reads stay open; writes lock when uncovered). Do not pitch on invite / upload / approve / availability — those are covered-property gates, not sales moments.

Onboarding does **not** open the paywall. Soft pitch + purchase (`paywall-trust`) is reached from the create-estate path (`openEstateCreatePaywall` / upgrade sheet → Start trial).

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
Create property, no free slot
  → upgrade sheet → paywall-trust?source=&returnTo=
  ↓ Start 14-day free trial / Subscribe
  Store sheet (intro on selected SKU) → rating once → returnTo

Sponsor lapsed (you are host, not sponsor; invite role `owner`)
  → SponsorCoverageBanner → Take over sponsorship | Upgrade to take over
  (no generic pitch for the lapse itself)
```

---

## Regression checklist (slots)

- [ ] New signup → Add my property → paywall → store intro on selected pack → writable
- [ ] Invite redeem → no trial, lands in property
- [ ] No free slot → create shows paywall with three packs
- [ ] Delete property → slot frees for reuse (no second intro from the app)
- [ ] Host on covered estate: full write; cannot invite hosts / delete / transfer
- [ ] Sponsor lapse: all sponsored properties read-only; named message + transfer
- [ ] Downgrade Domaine → Résidence with 3 properties: all locked until sponsor chooses 1

---

## Expo Go / no RC key

Trust shows a native-only hint. `__DEV__` may still call `startAppTrialRpc` so Expo web can create locally — never in a release build.
