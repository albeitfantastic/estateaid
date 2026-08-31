import { useEstateCoverageStore } from '@/store/estate-coverage-store';
import { openUpgradePaywall, type UpgradeFeature } from '@/lib/maison-pro-upgrade';

/**
 * Host capability denied:
 * - Owner on someone else's uncovered property → sponsor_lapsed (never upgrade pitch).
 * - Sponsor with no free slots on create → upgrade.
 * - Over-allocation → elect coverage (caller shows choose UI).
 */
export function openHostCapabilityDenied(
  estateId: string | undefined,
  feature: UpgradeFeature,
  returnTo?: string
): 'upgrade_required' | 'sponsor_lapsed' | 'over_allocated' {
  if (estateId) {
    const coverage = useEstateCoverageStore.getState().byId[estateId];
    if (coverage && !coverage.covered && coverage.actorRole === 'owner') {
      return 'sponsor_lapsed';
    }
    if (coverage?.sponsorOverAllocated && coverage.actorRole === 'sponsor') {
      return 'over_allocated';
    }
  }
  // Only create / slot purchase should open paywall (§8).
  if (
    feature === 'estate.create' ||
    feature === 'estate.createAsCoOwner' ||
    feature === 'estate.createAdditional' ||
    feature === 'generic'
  ) {
    openUpgradePaywall(feature, returnTo);
    return 'upgrade_required';
  }
  return 'sponsor_lapsed';
}
