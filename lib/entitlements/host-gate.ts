import { useEstateCoverageStore } from '@/store/estate-coverage-store';
import { openUpgradePaywall, type UpgradeFeature } from '@/lib/maison-pro-upgrade';

/**
 * Host capability denied: upgrade only when the actor sponsors (or has no coverage row).
 * Never show "Upgrade to Maison Pro" for someone else's subscription lapse.
 */
export function openHostCapabilityDenied(
  estateId: string | undefined,
  feature: UpgradeFeature,
  returnTo?: string
): 'upgrade_required' | 'sponsor_lapsed' {
  if (estateId) {
    const coverage = useEstateCoverageStore.getState().byId[estateId];
    if (coverage && !coverage.covered && coverage.actorRole === 'coOwner') {
      return 'sponsor_lapsed';
    }
  }
  openUpgradePaywall(feature, returnTo);
  return 'upgrade_required';
}
