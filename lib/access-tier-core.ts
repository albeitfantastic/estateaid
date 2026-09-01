import { slotsForEntitlementId, slotsForProductId, TRIAL_SLOT_COUNT } from '@/lib/subscription-config';
import type { SubscriptionEntitlementRow } from '@/types/subscription';
import { rowGrantsAccess } from '@/lib/subscription-access';

/**
 * Resolve integer slot count from RC mirror rows + trial + optional grandfather.
 * Product id wins over entitlement id so a boolean entitlement cannot flatten 1/3/7.
 * Offline / no rows → 0 (app stays readable).
 */
export function deriveSlotCount(input: {
  rows: Pick<SubscriptionEntitlementRow, 'entitlement_id' | 'product_id' | 'status' | 'expires_at'>[];
  trialEndsAt?: string | null;
  grandfatheredSlots?: number | null;
  /** SDK-reported max slots when mirror lags. */
  sdkSlotCount?: number;
}): number {
  let fromRows = 0;
  for (const row of input.rows) {
    if (!rowGrantsAccess(row)) continue;
    fromRows = Math.max(
      fromRows,
      slotsForProductId(row.product_id),
      slotsForEntitlementId(row.entitlement_id)
    );
  }
  const end = input.trialEndsAt?.trim();
  const trialSlots = end && new Date(end).getTime() > Date.now() ? TRIAL_SLOT_COUNT : 0;
  const gf = Math.max(0, input.grandfatheredSlots ?? 0);
  const sdk = Math.max(0, input.sdkSlotCount ?? 0);
  return Math.max(fromRows, trialSlots, gf, sdk);
}

export function trialDaysRemaining(trialEndsAt?: string | null): number | null {
  const end = trialEndsAt?.trim();
  if (!end) return null;
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return null;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function effectiveTrialEndsAt(
  storeTrialEndsAt?: string | null,
  profileTrialEndsAt?: string | null
): string | null {
  const store = storeTrialEndsAt?.trim();
  if (store && new Date(store).getTime() > Date.now()) return store;
  const profile = profileTrialEndsAt?.trim();
  if (profile && new Date(profile).getTime() > Date.now()) return profile;
  return null;
}

export function hasUsedTrialFlag(input: {
  hasUsedTrial?: boolean | null;
  trialEndsAt?: string | null;
  trialStartedAt?: string | null;
}): boolean {
  if (input.hasUsedTrial) return true;
  return Boolean(input.trialEndsAt?.trim() || input.trialStartedAt?.trim());
}
