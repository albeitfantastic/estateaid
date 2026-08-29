# Maison Paywall Flow

Intent-triggered soft pitch → **RevenueCat** (store free trial / subscribe) → post-purchase **rating** (once). Warm, minimal, premium — no fake discounts, no timers.

Primary conversion is the App Store / Play Store trial via RevenueCat. App-managed `startAppTrialRpc` is a **fallback only** when no RC API key is available (e.g. Expo Go / missing env), reachable from Outcome.

Onboarding does **not** open the paywall. Soft pitch opens from upgrade triggers (`source` + optional `returnTo`).

**Estate-scoped entitlement:** host tools follow the estate’s **sponsor** (trial/Pro), not each co-owner’s personal tier. Never open the upgrade sheet when a co-owner hits a lapsed sponsor — show the named lapse + transfer UI instead (`SponsorCoverageBanner`).

---

## File Structure

```
lib/entitlements/capabilities.ts   can() / useCan() — single gate
lib/entitlements/host-gate.ts      upgrade vs sponsor_lapsed routing
lib/maison-pro-upgrade.tsx         Upgrade bottom sheet → paywall-trust
store/estate-coverage-store.ts     covered / sponsor name / role cache
```

---

## Paywall triggers (§3.2)

Ordered by signal strength:

| Trigger | Feature / source |
|---------|------------------|
| Co-owner taps New estate (already hosts on a covered estate) | `estate.createAsCoOwner` |
| Sponsor attempts a 2nd estate | `estate.create` |
| Invite guest/co-owner on an uncovered estate **you sponsor** | `guests.invite` |
| Upload document | `documents.upload` |
| Create ticket/issue | `events.write` |
| Edit availability rules | `availability.write` |
| Approve/decline stay request | `stays.approve` |

Never trigger the paywall when the actor is entitled and the estate is uncovered only because **someone else’s** sponsorship lapsed → transfer / named message path.

---

## Tier & sponsorship

| Situation | Host surface |
|-----------|----------------|
| **You sponsor, standard (uncovered)** | Create/view/edit basic details; read calendar/contacts/FAQ/docs; no invites/uploads/approvals/availability write |
| **You co-own a covered estate** | Full host capabilities on that estate (even if your account is standard) |
| **You co-own an uncovered estate** | Read-only; banner names the sponsor; Pro/trial co-owners can transfer sponsorship |
| **trial / pro** | Can create additional estates you sponsor; can take over sponsorship |

`estate.create` is account-scoped: trial/pro, or standard with `sponsoredEstateCount === 0`. Co-owned estates do **not** count.

Co-owner seat cap: **3** per estate (plus sponsor).

---

## Navigation Flow

```
Intent (create estate / invite / upload / … on estate you sponsor)
  → upgrade sheet → paywall-trust?source=&returnTo=
  ↓ Continue
/(app)/settings/paywall-outcome → RC / exit

Sponsor lapsed (you are co-owner)
  → SponsorCoverageBanner → Take over sponsorship | Upgrade to take over
  (no generic Maison Pro sheet for the lapse itself)
```

---

## Regression checklist (estate entitlement)

- [ ] Standard co-owner B on Pro user A’s estate: full host tools on A’s estate
- [ ] B taps New estate → `estate.createAsCoOwner` pitch
- [ ] B with 0 sponsored estates can still create their first estate
- [ ] A’s subscription ends → read-only for A and B; B (Pro) sees named lapse + working transfer
- [ ] After transfer, writable; A retains co-owner access
- [ ] Standard co-owner on lapsed estate: upgrade path, no broken transfer
- [ ] Co-owner invites blocked at seat cap (client + server)
- [ ] Direct `create_estate` as standard user who already sponsors → `upgrade_required`

---

## Expo Go / no RC key

Outcome can still call `startAppTrialRpc` when RevenueCat is unavailable.
