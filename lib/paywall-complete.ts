import { Alert } from 'react-native';

import { fetchSubscriptionEntitlements, rowGrantsAccess } from '@/lib/subscription-access';
import {
  Purchases,
  isEntitlementActiveInCustomerInfo,
  isRevenueCatConfigured,
} from '@/lib/revenuecat-client';
import { MAISON_PRO_DISPLAY_NAME, PRIMARY_ENTITLEMENT_ID, isPrimaryEntitlementId } from '@/lib/subscription-config';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function pollMirrorUntilActive(
  refetch: () => Promise<void>,
  maxAttempts = 8
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    await refetch();
    await sleep(1500);
    const { data } = await fetchSubscriptionEntitlements();
    const row = data?.find((r) => isPrimaryEntitlementId(r.entitlement_id));
    if (row && rowGrantsAccess(row)) return true;
  }
  return false;
}

export async function confirmPurchaseAccess(opts: {
  refetch: () => Promise<void>;
  syncPurchasesAndRefetch: () => Promise<void>;
  refreshProfile: () => Promise<unknown>;
  t: (key: string, opts?: Record<string, string>) => string;
}): Promise<'active' | 'sdk' | 'pending'> {
  const ok = await pollMirrorUntilActive(opts.refetch);
  await opts.syncPurchasesAndRefetch().catch(() => undefined);
  await opts.refreshProfile().catch(() => undefined);
  let sdkActive = false;
  try {
    if (isRevenueCatConfigured()) {
      const info = await Purchases.getCustomerInfo();
      sdkActive = isEntitlementActiveInCustomerInfo(info, PRIMARY_ENTITLEMENT_ID);
    }
  } catch {
    sdkActive = false;
  }
  if (ok) return 'active';
  if (sdkActive) return 'sdk';
  return 'pending';
}

export function alertPurchaseResult(
  status: 'active' | 'sdk' | 'pending',
  t: (key: string, opts?: Record<string, string>) => string,
  onOk: () => void
) {
  const plan = MAISON_PRO_DISPLAY_NAME;
  if (status === 'pending') {
    Alert.alert(t('paywall.processingTitle'), t('paywall.processingBody'), [
      { text: t('common.ok'), onPress: onOk },
    ]);
    return;
  }
  Alert.alert(t('paywall.welcomeTitle', { plan }), t('paywall.welcomeBody'), [
    { text: t('common.ok'), onPress: onOk },
  ]);
}
