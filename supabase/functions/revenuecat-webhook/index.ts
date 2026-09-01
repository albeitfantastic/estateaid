/**
 * RevenueCat → Supabase entitlement mirror.
 *
 * Store intro and paid access both land here as active entitlement rows. Slot count comes from
 * `product_id_to_slots` on the purchased SKU (1 / 3 / 7), including during the 14-day intro.
 * Leftover app-managed `profiles.trial_ends_at` still exists for accounts already mid old trial;
 * new users must not receive that RPC grant. Do not mix the two clocks for the same UX period.
 *
 * Security:
 * - verify_jwt=false in config.toml: RevenueCat does not send Supabase JWTs.
 * - Authenticate using Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET> (set the same value in RevenueCat dashboard webhook auth).
 * - Never log raw bodies, app_user_id, or product identifiers in production if policy forbids; here we log only event type + outcome.
 * - Upserts use service role; clients cannot write this table (RLS).
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  eventToUpsertRows,
  parseWebhookPayload,
} from '../_shared/revenuecat-webhook.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (!secret || secret.length < 16) {
    console.error('revenuecat-webhook: missing or weak REVENUECAT_WEBHOOK_SECRET');
    return new Response(JSON.stringify({ error: 'server_misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const auth = req.headers.get('Authorization') ?? '';
  const expected = `Bearer ${secret}`;
  if (auth !== expected) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const parsed = parseWebhookPayload(raw);
  if (!parsed.ok) {
    return new Response(JSON.stringify({ error: parsed.error }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rowsResult = eventToUpsertRows(parsed.body);
  if ('error' in rowsResult) {
    return new Response(JSON.stringify({ error: rowsResult.error }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rows = rowsResult;
  if (rows.length === 0) {
    // No entitlement_ids — acknowledge (e.g. test events). Idempotent no-op.
    return new Response(JSON.stringify({ ok: true, processed: 0 }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    console.error('revenuecat-webhook: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return new Response(JSON.stringify({ error: 'server_misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const eventType = parsed.body.event?.type ?? 'unknown';
  let processed = 0;

  for (const row of rows) {
    const { error } = await admin.from('subscription_entitlements').upsert(
      {
        user_id: row.user_id,
        entitlement_id: row.entitlement_id,
        product_id: row.product_id,
        status: row.status,
        expires_at: row.expires_at,
        store: row.store,
        last_event_id: row.last_event_id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,entitlement_id' }
    );
    if (error) {
      console.error('revenuecat-webhook: upsert_failed', eventType, error.message);
      return new Response(JSON.stringify({ error: 'upsert_failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    processed += 1;
  }

  console.log('revenuecat-webhook: ok', { event_type: eventType, processed });

  return new Response(JSON.stringify({ ok: true, processed }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
