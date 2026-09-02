# Maison — Product & Technical Specification v2

**Target:** Expo / React Native (expo-router), Supabase, RevenueCat
**Mode:** Plan first, then implement. Do not edit files until the plan is confirmed.

**This document supersedes in full:**
`maison-ux-tiering-spec.md`, `maison-spec-revision-sponsorship.md`, `maison-addendum-trial-and-firstrun.md`, `maison-monetization-rewrite.md`.
Discard those. This is the single source of truth.

---

## 0. Instructions for the agent

1. Read the existing codebase first. Map the current routes under `app/(auth)`, `app/(onboarding)`, `app/(app)`. Report any mismatch with the routes referenced here before planning.
2. Locate the current entitlement logic (resolving `standard | trial | pro` from RevenueCat + the Supabase mirror) and the `HostProLockTouchable` component. Both are removed or rewritten by this spec.
3. Produce a plan grouped by the phases in §19. Do not reorder — later phases depend on earlier ones.
4. Where this doc says **assumption**, verify against the code and correct the plan rather than following it blindly.
5. Every section has acceptance criteria. Treat them as the definition of done.

**Non-goals:** no visual redesign, no new backend services, no Android-specific work, no in-app messaging.

---

## 1. The model

Maison is a property management app for holiday-home owners, also usable for a primary residence.

**There are no user tiers.** Every account is the same kind of account. What is sold is **property slots**: a user holds N slots, and creating a property consumes one. A property whose slot is active is **covered**. Coverage is the only thing that gates writes. A user's own purchases are irrelevant on properties they did not create.

Delete `standard | trial | pro` as a concept. It is replaced by two independent facts:

- **On the user:** `slotCount` — how many slots they hold
- **On the property:** `sponsorUserId` and whether it is covered

This exists so that a household co-managing one property pays once, not twice.

---

## 2. Slots and products

### 2.1 Slot mechanics

- `slotCount` is **resolved**, not stored as truth: RevenueCat entitlement + any active trial.
- Creating a property requires a free slot: `slotCount > propertiesSponsored`.
- On creation, `sponsorUserId` = creator. That property consumes one of their slots.
- Deleting or archiving a property frees its slot for reuse.

### 2.2 Products

Three packs. Six SKUs total, all in **one** App Store subscription group, ordered Résidence → Domaine → Héritage so up/downgrades prorate natively.

| Pack | Slots | Annual | Monthly |
|---|---|---|---|
| Résidence | 1 | €149.99 | €14.99 |
| Domaine | 3 | €299.99 | €29.99 |
| Héritage | 7 | €499.99 | €49.99 |

RevenueCat must resolve the active product to an **integer** slot count (1, 3, or 7). Never a boolean entitlement.

**Paywall UI:** three cards, annual selected by default, Domaine visually primary. Show a per-property-per-year figure on each card (€150 / €100 / €71) — that column is the pitch. Monthly view shows €X/property/month, never an annual figure under a monthly price. Do **not** render a feature comparison matrix; every pack includes every feature, and the only variable is slot count.

Do not label anything "Most popular" until there is data to support it.

Above 7 properties is not sold. Link to a contact form; grant manually via the mirror.

### 2.3 Over-allocation

If `slotCount` drops below `propertiesSponsored` — downgrade, lapse, refund — do **not** pick properties to lock arbitrarily.

- Lock **all** properties sponsored by that user.
- Prompt the sponsor to choose which to keep covered, up to their remaining slots.
- Never delete anything.

**Acceptance criteria**
- Downgrade from Domaine to Résidence with 3 properties → all 3 locked, sponsor prompted to choose 1.
- No data loss at any point.

---

## 3. Roles

Three roles, assigned at invite time by the sponsor, stored per property per user.

| Role | Who | Count |
|---|---|---|
| **Sponsor** | Creator; holds the slot | Exactly 1 |
| **Host** | Invited with `owner` role (UI label: Host) | Max 4 total, including the sponsor |
| **Guest** | Invited with guest role | Uncapped |

**Assumption to confirm:** the cap is 4 owner-role holders in total (sponsor + 3). Adjust `OWNER_CAP` if the intent was 4 in addition to the sponsor.

### 3.1 Permissions on a covered property

| Action | Sponsor | Host | Guest |
|---|---|---|---|
| Read documents, contacts, FAQ, events | Yes | Yes | Stay window only |
| Write documents, contacts, FAQ, events | Yes | Yes | No |
| Set availability rules | Yes | Yes | No |
| Block dates | Yes | Yes | No |
| Request dates | Yes | Yes | Yes |
| Approve / decline stay requests | Yes | Yes | No |
| Invite guests | Yes | Yes | No |
| Invite or remove hosts | Yes | **No** | No |
| Edit property details | Yes | Yes | No |
| Delete property | Yes | No | No |
| Transfer sponsorship | Yes | No | No |
| Manage subscription | Yes | n/a | n/a |

Everything operational is shared; everything structural stays with the sponsor. This prevents a co-host filling the four seats, removing the sponsor, or deleting the property.

On an **uncovered** property every write becomes unavailable for every role. Reads are unaffected.

### 3.2 Host role grants nothing account-wide

Holding the host (`owner`) role on someone else's property confers no slot. Creating your own property still requires your own slot. Without this rule, one purchase distributes free accounts indefinitely.

### 3.3 Invite roles in code

The existing `guest | owner` invite roles map directly. The invite role value stays `owner`; UI copy uses **Host**. Migrate existing rows as needed.

- Add the role picker to `estates/[estateId]/guests/invite.tsx`, which currently hardcodes `guest`.
- The host option is disabled with an explanatory label when `OWNER_CAP` is reached or the property is uncovered.
- Keep `updateInvitationRole` working. Demoting owner → guest revokes write capabilities immediately.

---

## 4. Capability layer

One module. No screen reads a subscription or role directly.

```ts
// lib/entitlements/capabilities.ts

export type PropertyRole = 'sponsor' | 'owner' | 'guest' | 'none';

export type Capability =
  // account-scoped
  | 'property.create'
  // property-scoped
  | 'property.edit' | 'property.delete' | 'property.transferSponsorship'
  | 'documents.read'    | 'documents.write'
  | 'contacts.read'     | 'contacts.write'
  | 'faq.read'          | 'faq.write'
  | 'events.read'       | 'events.write'
  | 'availability.read' | 'availability.write'
  | 'dates.block'       | 'dates.request'
  | 'stays.approve'
  | 'guests.invite'     | 'owners.invite'
  | 'calendar.view'     | 'activity.view';

export interface AccountContext {
  slotCount: number;
  propertiesSponsored: number;
  hasUsedTrial: boolean;
}

export interface PropertyContext {
  propertyId: string;
  role: PropertyRole;
  covered: boolean;
  ownerCount: number;        // includes sponsor
  stayWindowActive: boolean; // guest context unlock
}

export function can(
  cap: Capability,
  account: AccountContext,
  property?: PropertyContext,
): boolean;
```

Rules the implementation must satisfy:

- `property.create` is the **only** account-scoped capability. True when `slotCount > propertiesSponsored`.
- Every other capability requires a `PropertyContext`. Called without one: throw in dev, deny in production.
- Writes require `covered === true` **and** role `sponsor` or `owner`.
- `owners.invite`, `property.delete`, `property.transferSponsorship` require `role === 'sponsor'`.
- `owners.invite` additionally requires `ownerCount < OWNER_CAP`.
- `dates.request` is available to all roles and does **not** require `covered`.
- Guest reads require `stayWindowActive` and do not require `covered`.

Expose as `useCan()` reading from the entitlement store.

**Acceptance criteria**
- Grepping for a subscription check outside this module returns nothing.
- A user with zero slots has full write access on a covered property they were invited to as host.
- The same user cannot create their own property.

---

## 5. Onboarding

### 5.1 The path

```
splash → auth → Q1–Q4 → start fork → [property creation | code redemption] → home
```

No paywall in the quiz or start fork. First property create with no free slot is the purchase moment (§6 / §8): store intro on the selected pack, then that SKU auto-renews.

### 5.2 The start fork (new screen)

After the quiz: **"How do you want to start?"**

- **I have an invite code** → code entry → redeem → land in that property as guest or owner
- **Add my property** → creation form (no free slot → paywall / store intro per §6)

Notes:
- A user arriving via deep link (§9.1) **skips the quiz and this fork entirely** — the invite is already resolved. This screen exists for people who received a code by messenger and typed it manually.
- The redeem path grants no trial and shows no price at any point.
- A redeemer can add their own property later from the Properties tab; §6 fires then.

### 5.3 Framing screen

One screen before property creation, not a series. Its button names the action — "Add your property", not "Get started".

The creation form stays minimal: name, type, optional location. Everything else editable later.

**Acceptance criteria**
- New signup can finish the quiz and fork without a paywall. Creating a property with no free slot opens Trust.
- `completeOnboarding()` still fires.
- Returning sign-in with onboarding complete goes straight to home, no quiz.

---

## 6. Trial

- Store **introductory offer**: 14 days free on the pack the user selects (Résidence / Domaine / Héritage, annual default, Domaine highlighted).
- The App Store or Play Store collects a payment method at start. After 14 days **that SKU auto-renews** unless they cancel in store subscription settings.
- First property create with no free slot opens the paywall. There is no silent `start_app_trial` grant.
- Apple/Google decide intro eligibility (once per store account). Delete-and-recreate does not grant a second intro.
- A user who joined by invite and later creates their first property sees the same store trial.

### 6.1 Trial must be visible

Granted as a store subscription (intro period) and **never hidden**.

All three required:

1. **Home status line** — quiet, non-modal: *"Trial · 14 days left · used/total slots"*. Tappable → subscription screen. Neutral days 1–10, emphasised from day 11.
2. **Settings → Subscription** — pack slots, exact trial end date, that the plan renews unless cancelled.
3. **Terms of Service** — trial length, that the store holds a payment method, and that the plan auto-renews unless cancelled.

Copy must state the **then-price** and auto-renewal above the subscribe CTA. That is what keeps the offer lawful in the EU and US.

**Acceptance criteria**
- Trial status reachable from home in one tap throughout.
- No countdown ever appears as an interstitial or blocking modal.
- The paywall discloses trial → then €X / period → auto-renew → how to cancel, before the store sheet.

### 6.2 Conversion moments

Three. Do not add a fourth.

**Invite accepted** — strongest signal in the app. Inline card on home showing what they've built plus the annual plan. Once per user, not per acceptance.

**Day 11** — inline card leading with an inventory of what they made:

> 2 documents · 4 contacts · 1 guest · 6 days blocked
> Keep managing Dom w Rębrszowie — Maison Résidence from €149.99/year

The inventory is the pitch. If all counts are zero, suppress the card and show the setup checklist (§10.2) instead — an inventory of nothing is worse than no pitch.

**Expiry, on next write attempt** — see §7.

---

## 7. Coverage lapse

When a slot expires or is lost, every property it covered becomes read-only for **all** roles.

- No data deleted, ever. Documents open, contacts dial, calendar renders.
- Do not interrupt on the expiry date. The prompt appears on the next write attempt.
- The lock message names the cause: *"Management is paused — [sponsor name]'s subscription has ended."* A host who pays for their own property elsewhere must never see a generic upgrade prompt on a property they don't sponsor. This is the most churn-inducing possible bug in this design.
- The message states what is **retained**, not only what is locked: *"Everything you added is still here."*
- **Sponsor transfer:** any host with a free slot takes over in one tap from that message. `sponsorUserId` updates, property becomes covered, their slot is consumed, previous sponsor keeps their host (`owner`) role.
- A host with no free slot sees the purchase path instead.
- Guests are unaffected. Invites stay valid. Guests never see a paywall anywhere in the app.

---

## 8. Paywall triggers

The trigger is **one condition**:

> A user attempts to create a property with no free slot.

Everything else is coverage state, not a sales moment. Two sub-cases, which must not be confused:

| Condition | Behaviour |
|---|---|
| No free slot | Paywall: pick pack, store intro trial (or Subscribe if intro already used) |

A leftover app-managed `trialEndsAt` on older profiles still grants slots until that date. New accounts do not write `trial_ends_at` from the client.

Retain `paywall-trust` as the pack picker and purchase screen. `paywall-outcome` redirects to Trust.

### 8.1 Replace the dead-end upgrade alert

`HostProLockTouchable` currently shows an alert with no navigation.

- Replace with a bottom sheet: title, one-line benefit, primary **"Choose a plan"**, secondary **"Not now"**.
- Primary CTA reaches the paywall in every case.
- Accepts a `feature` prop so copy is specific.
- No `Alert.alert` remains for upgrade prompts anywhere.

---

## 9. Guest experience

### 9.1 Deep-linked invites — highest-value item in this section

Guests currently must find Stays → Redeem and type an 8-character code. This is the worst friction point for the target audience: non-technical family members.

- Universal/app link per invite: `https://<domain>/i/<CODE>`
- Set OG tags so the link previews in WhatsApp as *"Anna invited you to Dom w Rębrszowie"* with an image. A bare URL from a family member reads as spam.
- **App installed** → opens the invite preview (§9.2) with the code resolved.
- **Not installed** → web landing page: property name, who invited them, one line on what Maison is, App Store button. One screen only. Code persists via deferred deep link; manual entry as fallback.
- The share sheet shares the **link**, with the raw code as secondary text.
- **Already signed in** → resolves straight to acceptance, bypassing auth entirely. Easy to miss, common in practice.

### 9.2 Invite preview before auth

Do **not** send an unauthenticated invite arrival to `/(auth)`. An account form with no context is where non-technical people quit.

Show the property first: name, location, who invited them, what accepting means. Then a button labelled to the situation — "Sign up to accept", not a generic auth screen.

Because the invite resolved before auth, **skip the quiz and start fork entirely** for these users. The quiz is owner-oriented; answering it as a guest produces data that corrupts the §11 seeding.

### 9.3 Guest landing

After acceptance: the property and their stay, **not** the ten-tile hub.

One header line — *"Anna invited you to Dom w Rębrszowie"* — and two actions: **Request dates**, **View property**. No trial, no price, no setup checklist.

### 9.4 Context unlock countdown

Guests get FAQ / Documents / Contacts / Events from ~3 days before a stay until +1 day after. A locked tile currently gives no explanation.

- Show *"Unlocks 3 days before your stay"*, and with a confirmed stay, *"Unlocks in 2 days"*.
- After the window: *"Available during your stay"*.
- Visually and behaviourally distinct from coverage locks. Tapping one must **never** open a paywall.

### 9.5 Guest empty states

- Stays tab: "Ask the property host for an invite link" + an **Enter a code** button.
- Properties tab mirrors it.

### 9.6 Metric note

A meaningful fraction of guests will never plan a stay in-app — they'll text the host like they always have. Guest activation should be measured as **accepted invite and opened the property once**, not "requested dates".

---

## 10. First-run and the property hub

### 10.1 The hub problem

Ten identical tiles with no counts and no hierarchy read as a menu of chores. Fine as a return destination, wrong as a first impression.

### 10.2 Setup checklist

Dismissible progress card **above** the grid. Order matters:

1. **Block your first dates** — single-player, immediate visible payoff, teaches the core concept without explanation
2. **Invite someone** — the moment the app becomes worth having; second rather than first so the guest arrives to a property with content in it
3. **Add a document**
4. **Add a contact**

Each item deep links to the action. Progress persists. Auto-dismisses on completion.

Availability rules, expenses and handover are deliberately absent — discovered when needed, not pushed.

### 10.3 Tile states

- Counts on filled tiles: `Documents · 4`, `Contacts · 2`
- Empty tiles dimmed or dash-outlined
- The next checklist action's tile gets visual priority; priority moves as steps complete

### 10.4 Structural questions to resolve

- **Maintenance is both a hub tile and a bottom tab.** Users will assume they differ. Pick one home for it.
- **Availability, Calendar and Stay Requests overlap** conceptually — all three are "when can this place be used". If any consolidation is possible, that cluster is where it lives.

---

## 11. Quiz and personalisation

### 11.1 Persist the answers

Q1–Q4 answers are currently discarded. Store on the user profile in Supabase (columns or `jsonb`, matching the existing schema). Write at the last question alongside `completeOnboarding()`.

### 11.2 Make them do something

**Assumption to verify:** at least one question distinguishes property type or intended use. If not, replace the quiz with a single screen: *"What will you use Maison for?"* → Holiday home / Primary residence / Rental property / Managing for someone else.

Seed the first property accordingly:

- **Holiday home** → FAQ starters, Stays and Calendar emphasised
- **Primary residence** → maintenance templates, Documents emphasised
- **Rental property** → Stay Requests and Availability emphasised
- **Managing for someone else** → Guests and Contacts emphasised

Seeded content must be visibly editable and deletable, and must never block the user. This is what makes "invite someone" viable as step 2 of the checklist.

### 11.3 Stale answers for redeemers

A user who redeemed a code answered the quiz before having a property. Re-ask property type **once**, inline on the creation form, and use that for seeding rather than the stale answer.

Give them the full setup checklist — they know the guest side, which is a narrow slice. Don't assume familiarity.

---

## 12. Naming

"Plan Stay" (host, direct book) and "Request Stay" (guest) read as the same thing.

- Host → **"Block dates"**, subtitle "Reserve the property for yourself"
- Guest → **"Request dates"**

Rename routes only if low-risk; visible labels are what matter. If `/(app)/plan-stay` is renamed, add a redirect.

---

## 13. Notifications

Expo Notifications. Minimum set:

| Event | Recipient |
|---|---|
| New stay request | Sponsor + hosts |
| Request approved / declined / alternate proposed | Guest |
| Stay starts tomorrow | Guest + hosts |
| New ticket/issue created | Sponsor + hosts |
| Invite accepted | Inviter |

- Permission requested **after** the first meaningful action (first property created, or first invite redeemed). Never on cold start.
- Per-category toggles in Settings.
- Each notification deep links to the relevant screen.

---

## 14. Feature additions

### 14.1 Recurring maintenance

Events already support recurrence. Extend for maintenance: annual, semi-annual, quarterly, monthly, custom. Starter templates — boiler service, chimney sweep, gutter clearing, smoke alarm test, winterisation, water shut-off check. Reminder fires as push with per-event lead time.

### 14.2 Handover checklist

Per-property template (close windows, empty fridge, bins out, thermostat to 12°, lock shutters). Surfaces to the guest on the last day of their stay and +1 day after. Sponsor or host defines it; guest ticks items; completion written to the Activity log.

### 14.3 Expenses — build last

Per-property entries: date, amount, category, note, optional link to a stay or maintenance event. Property total and per-year breakdown. No reporting, no export, no multi-currency in this pass.

The app must not present expense figures as financial or tax advice. Record-keeping only — no deductibility or tax-treatment calculations.

### 14.4 Guest messaging — out of scope

Recommended but deferred. Pulls in moderation, notification and support obligations that should not ride along with this rework.

---

## 15. What NOT to build

- **No onboarding carousel or slideshow.** Swiped past in seconds; delays the only thing that teaches the app, which is using it.
- **No coach marks.** If the UI needs overlay arrows, fix the UI.
- **No urgency-styled countdowns.** A neutral "14 days left" is fine; a red ticking clock is a dark pattern and a named target of the forthcoming EU Digital Fairness Act.
- **No trial extension offers on expiry.** Adds a decision, delays the real one.
- **No fake extra trial after a store intro.** Apple/Google already limit introductory offers per account.

Tooltips permitted in exactly two places, both conceptual rather than visual: why guest content unlocks near stay dates, and the difference between blocking and requesting dates.

---

## 16. Server-side enforcement

Client gating is insufficient. A user's write access depends on a **third party's** subscription state — exactly what gets bypassed by direct API calls.

- RLS on all property-scoped tables resolves coverage through `sponsorUserId` → RevenueCat mirror + `trialEndsAt`.
- Reject property inserts when the creator has no free slot.
- Reject host invites beyond `OWNER_CAP`.
- Reject host-role users attempting sponsor-only actions.
- Store intro eligibility is enforced by Apple/Google, not `hasUsedTrial`.
- Distinguishable error codes: `NO_FREE_SLOT`, `OWNER_CAP_REACHED`, `NOT_SPONSOR`, `PROPERTY_UNCOVERED`, `TRIAL_ALREADY_USED`. The client maps each to a specific message.
- Index the coverage lookup; it runs on nearly every request.

---

## 17. Legal surfaces

Not optional, easy to forget on mobile.

- **Terms of Service** and **Privacy Policy** — linked from Settings and from the paywall
- **Impressum** — separately required for a commercial operator based in Germany
- Trial description in the Terms per §6.1 (**legal review required before public launch** — do not invent warranty or consumer-law sections here)
- Restore Purchases and the RevenueCat Customer Center reachable from Settings without a subscription

This spec reflects design rationale, not legal advice. Have the Terms, Privacy Policy and Impressum reviewed by a lawyer before public launch.

---

## 18. Cleanup and migration

### 18.1 Cleanup

- Delete `paywall-main` and `paywall-trial` routes and any components used only by them.
- Remove dead onboarding→paywall navigation code.
- Verify no orphaned routes remain under `(onboarding)`.
- Remove the old `standard | trial | pro` tier resolution entirely.
- Run `npx expo lint --fix` after each phase. `react-hooks/exhaustive-deps` matters here: screen state depends on role, coverage and stay window simultaneously, and a stale dependency array produces locks that appear only on second navigation.

### 18.2 Migration

- Map existing invite roles: `owner` → `owner`, `guest` → `guest`. UI copy uses **Host** (not co-owner).
- Set `sponsorUserId = ownerId` on all existing properties.
- Derive `slotCount` for existing subscribers from their entitlement; **grandfather** anyone who would otherwise be over-allocated rather than locking them out.
- Set `hasUsedTrial = true` for any account with a past or present `trialEndsAt`.

---

## 19. Execution order

| Phase | Contents | Why here |
|---|---|---|
| 1 | §2 slots, §3 roles, §4 capability layer, §16 RLS | Everything gates on `can()` |
| 2 | §5 onboarding, §6 trial, §7 lapse, §8 paywall | Decides whether a new user stays |
| 3 | §9 guest experience | 9.1 deep links is the single highest-value item; do it before 9.4–9.5 |
| 4 | §10 first-run, §11 quiz | Cheap once onboarding is already open |
| 5 | §12 naming, §13 notifications, §14.1–14.2 | 13 unblocks 14.1 and 14.2 |
| 6 | §14.3 expenses, §18 cleanup | Last, so nothing is deleted while referenced |

Ship Phases 1–2 as one release.

---

## 20. Open decisions

1. **Host cap** — 4 total including sponsor, or 4 plus sponsor? Spec assumes the former.
2. **Slot reuse cooldown** — delete-and-recreate frees a slot immediately. Acceptable; if abuse appears, add a 24h cooldown rather than blocking deletion.
3. **Above 7 properties** — not sold. Contact form, manual grant. Revisit only if volume justifies it.
4. **Maintenance tile vs tab** — §10.4, needs a decision before Phase 4.

---

## 21. Regression checklist

Run after every phase.

1. New signup → quiz → fork → "Add my property" → paywall → store intro on selected pack → property writable.
2. New signup → fork → "I have an invite code" → redeem → lands in property, no trial, no price shown anywhere.
3. Invited-first user later creates their own property → same store intro on the selected pack.
4. Intro already used, no free slot → property creation shows the paywall with Subscribe (no free-trial sentence).
5. Delete property, create another → no second intro from the app (Apple/Google enforce eligibility).
6. Host-role user with zero slots: full write access on a covered property; cannot invite hosts, delete it, or transfer sponsorship.
7. Host cap: invite to the cap → next host invite blocked client- and server-side with distinct messaging; guest invites still work.
8. Sponsor lapse: all their properties read-only for all roles; named message; host with a free slot transfers in one tap; host without one sees the purchase path.
9. Guest during sponsor lapse: no change, no paywall, invite still valid.
10. Downgrade Family → Home with 3 properties: all locked, sponsor prompted to choose 1, nothing deleted.
11. Deep link, app installed, signed out → invite preview → sign up → accept → guest landing. No quiz, no fork.
12. Deep link, already signed in → straight to acceptance, no auth screen.
13. Guest with a confirmed stay 5 days out → countdown on locked tiles, not a bare lock. Tapping never opens the paywall.
14. Trial status reachable from home in one tap throughout; never blocks the screen.
15. Expiry: no modal on the expiry date; first write attempt shows the sheet; all created content still readable.
16. Returning sign-in with onboarding complete → straight to home, no quiz.
17. Offline / no RC key: no crash; `slotCount` resolves to 0 and the app remains readable.
18. Direct API probe: create property with no free slot → `NO_FREE_SLOT`.
19. Direct API probe: owner-role user calls a sponsor-only action → `NOT_SPONSOR`.