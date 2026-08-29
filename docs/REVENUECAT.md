# RevenueCat + Supabase integration

## Architecture

- **Identity:** Supabase Auth `user.id` (UUID) is passed to RevenueCat as `appUserID` via `Purchases.logIn` after session restore. Email is never used as the RevenueCat user id.
- **Trusted entitlement state:** `public.subscription_entitlements` is written **only** by the `revenuecat-webhook` Edge Function (service role). The mobile app reads via RLS (own rows only).
- **Client SDK:** Public RevenueCat API keys only. Used for purchases, restore, and store management UI — **not** as the sole authority for premium access.
- **UX gating:** `useSubscription()` reads the mirrored table (`isPro`). `sdkMaisonProActive` reflects the SDK for diagnostics / “pending sync” only. **Backend enforcement** for paid APIs/data should use `user_has_active_entitlement(entitlement_id)` (RPC) or equivalent server checks.
- **Maison Pro:** Default entitlement id is `Maison Pro` (must match the RevenueCat dashboard Identifier; override with `EXPO_PUBLIC_RC_ENTITLEMENT_ID`). Legacy `maison_pro` is still accepted as an alias. Products on the **current offering** should use store ids `monthly` and `yearly` (see `lib/subscription-config.ts`).
- **Paywalls UI:** `react-native-purchases-ui` — embedded `RevenueCatUI.Paywall` on the paywall route; **Customer Center** at Settings → Customer Center. Optional modals: `presentRevenueCatPaywallModal`, `presentRevenueCatCustomerCenter` in `lib/revenuecat-ui.ts`.
- **API keys:** Set platform-specific keys **or** a single `EXPO_PUBLIC_REVENUECAT_API_KEY` (e.g. Test Store / unified test key). Never commit secret keys; public SDK keys only.

## Deploy webhook

1. Apply migration `20260401120000_subscription_entitlements.sql`.
2. Deploy function: `supabase functions deploy revenuecat-webhook`
3. Set secret (must match RevenueCat dashboard “Authorization” header, value `Bearer <secret>`):

   ```bash
   supabase secrets set REVENUECAT_WEBHOOK_SECRET="your-long-random-secret"
   ```

4. In RevenueCat → Project → Integrations → Webhooks, set URL to:

   `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`

   Set authorization to Bearer token matching `REVENUECAT_WEBHOOK_SECRET`.

## Example: RLS for a paid-only feature (Postgres)

Do not trust `isPro` from the client in RLS. Use the RPC (SECURITY DEFINER, `auth.uid()` only):

```sql
CREATE POLICY "example_pro_only"
ON public.some_paid_table
FOR ALL
TO authenticated
USING (user_has_active_entitlement('maison_pro'))
WITH CHECK (user_has_active_entitlement('maison_pro'));
```

Adjust table and entitlement id to match your product.

## App builds

- **Expo Go:** Native IAP modules are not available; subscription screens degrade gracefully.
- **EAS / dev client / release:** Run `npx expo prebuild` (or EAS Build) so `react-native-purchases` and `react-native-purchases-ui` native code is linked.

## Security review (summary)

| Stored (Supabase) | Not stored |
|-------------------|------------|
| `user_id`, `entitlement_id`, `product_id`, `status`, `expires_at`, `store`, `last_event_id`, `updated_at` | Card numbers, full RC payloads, emails as RC ids |

| Public / client | Server-only |
|-----------------|-------------|
| Supabase anon key, RevenueCat public SDK keys, entitlement id constant | `REVENUECAT_WEBHOOK_SECRET`, service role key |

**Residual risks:** Webhook relies on shared-secret Bearer auth (rotate if leaked). RevenueCat must send `app_user_id` as your Supabase UUID. EXPIRATION events without `entitlement_ids` are a no-op in the handler (documented limitation).

## Testing checklist

1. **No subscription:** New user → `subscription_entitlements` empty → `isPro` false, paywall shows packages (dev build).
2. **Active:** Complete sandbox purchase → webhook fires → row upserted → app shows Premium after refresh/poll.
3. **Expired:** Move clock / RC sandbox tools → status `expired` → `isPro` false.
4. **Restore:** Delete app, reinstall, Restore purchases → RC restores → webhook updates → row present.
5. **Logout / login:** User A out, User B in → RC `logOut` + `logIn(B)` → B’s rows only via RLS.
6. **Webhook:** Wrong Bearer → 401. Invalid JSON → 400. Valid event → 200 and idempotent upsert.
7. **RLS:** As user A, cannot `select` user B’s rows (only own `user_id`).
