/**
 * Pure parsing + mapping for RevenueCat webhook payloads.
 * Keep logic here so the Edge entrypoint stays thin and testable in isolation (e.g. Deno tests).
 *
 * Security: reject non-UUID app_user_id so we never write arbitrary keys as user_id.
 */

export type SubscriptionStatus =
  | 'active'
  | 'expired'
  | 'cancelled'
  | 'grace_period'
  | 'billing_issue'
  | 'unknown';

export type UpsertRow = {
  user_id: string;
  entitlement_id: string;
  product_id: string | null;
  status: SubscriptionStatus;
  expires_at: string | null;
  store: string | null;
  last_event_id: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidAppUserId(id: unknown): id is string {
  return typeof id === 'string' && UUID_RE.test(id);
}

/** Map RevenueCat event type + expiration to stored status (minimal, access-oriented). */
export function deriveStatus(
  eventType: string,
  expirationAtMs: number | null | undefined
): SubscriptionStatus {
  const now = Date.now();
  const exp = expirationAtMs ?? null;
  const notExpired = exp == null || exp > now;

  switch (eventType) {
    case 'EXPIRATION':
    case 'SUBSCRIPTION_PAUSED':
      return 'expired';
    case 'BILLING_ISSUE':
      return notExpired ? 'billing_issue' : 'expired';
    case 'PRODUCT_CHANGE':
      return notExpired ? 'active' : 'expired';
    case 'CANCELLATION':
      // Still entitled until expires_at; treat as cancelled for display, access until expiry in app logic
      return notExpired ? 'cancelled' : 'expired';
    case 'GRACE_PERIOD_EXPIRATION':
      return 'expired';
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'NON_RENEWING_PURCHASE':
    case 'SUBSCRIBER_ALIAS':
    case 'TRANSFER':
      return notExpired ? 'active' : 'expired';
    default:
      return notExpired ? 'unknown' : 'expired';
  }
}

export function msToIso(ms: number | null | undefined): string | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

export interface RevenueCatWebhookBody {
  api_version?: string;
  event?: {
    type?: string;
    id?: string;
    app_user_id?: string;
    product_id?: string;
    entitlement_ids?: string[];
    expiration_at_ms?: number;
    grace_period_expiration_at_ms?: number;
    store?: string;
    environment?: string;
  };
}

export function parseWebhookPayload(raw: unknown): { ok: true; body: RevenueCatWebhookBody } | { ok: false; error: string } {
  if (raw == null || typeof raw !== 'object') return { ok: false, error: 'invalid_json' };
  const body = raw as RevenueCatWebhookBody;
  if (!body.event || typeof body.event !== 'object') return { ok: false, error: 'missing_event' };
  return { ok: true, body };
}

/**
 * Build upsert rows for each entitlement on this event.
 * If RevenueCat sends no entitlement_ids, skip (avoid inventing entitlements).
 */
export function eventToUpsertRows(body: RevenueCatWebhookBody): UpsertRow[] | { error: string } {
  const ev = body.event!;
  const eventId = ev.id;
  const appUserId = ev.app_user_id;
  const eventType = ev.type ?? 'UNKNOWN';

  if (!eventId || typeof eventId !== 'string') return { error: 'missing_event_id' };
  if (!isValidAppUserId(appUserId)) return { error: 'invalid_app_user_id' };

  const ids = ev.entitlement_ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    return [];
  }

  const expirationMs = ev.expiration_at_ms ?? ev.grace_period_expiration_at_ms;
  const status = deriveStatus(eventType, expirationMs);
  const expiresAt = msToIso(expirationMs);
  const productId = typeof ev.product_id === 'string' ? ev.product_id : null;
  const store = typeof ev.store === 'string' ? ev.store : null;

  const rows: UpsertRow[] = [];
  for (const eid of ids) {
    if (typeof eid !== 'string' || eid.length === 0 || eid.length > 128) continue;
    rows.push({
      user_id: appUserId,
      entitlement_id: eid,
      product_id: productId,
      status,
      expires_at: expiresAt,
      store,
      last_event_id: eventId,
    });
  }
  return rows;
}
