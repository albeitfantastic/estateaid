import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/paywall/ui/PrimaryButton';
import { SecondaryButton } from '@/components/paywall/ui/SecondaryButton';
import { useAccessTier } from '@/lib/access-tier';
import {
  openUpgradePaywall,
  type UpgradeFeature,
} from '@/lib/maison-pro-upgrade';
import { useEstateCoverageStore } from '@/store/estate-coverage-store';
import { useEstateStore } from '@/store/estate-store';
import { useAppTheme } from '@/theme/useAppTheme';

type Props = {
  estateId: string;
  /** When actor is the uncovered sponsor, which upgrade feature to open. */
  sponsorUpgradeFeature?: UpgradeFeature;
};

/**
 * Shown on host hubs when the estate is not covered.
 * Co-owners never see a generic "Upgrade" for someone else's lapse.
 */
export function SponsorCoverageBanner({
  estateId,
  sponsorUpgradeFeature = 'generic',
}: Props) {
  const colors = useAppTheme().colors;
  const tier = useAccessTier();
  const coverage = useEstateCoverageStore((s) => s.byId[estateId]);
  const transferSponsor = useEstateStore((s) => s.transferSponsor);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!coverage || coverage.covered) return null;
  if (coverage.actorRole !== 'sponsor' && coverage.actorRole !== 'coOwner') return null;

  const isSponsor = coverage.actorRole === 'sponsor';
  const canTransfer = !isSponsor && (tier === 'trial' || tier === 'pro');

  async function onTransfer() {
    setBusy(true);
    setError(null);
    const { error: err, code } = await transferSponsor(estateId);
    setBusy(false);
    if (err) {
      if (code === 'upgrade_required') {
        openUpgradePaywall('generic');
        return;
      }
      setError(err);
    }
  }

  return (
    <View style={[styles.banner, { backgroundColor: colors.borderSoft, borderColor: colors.border }]}>
      {isSponsor ? (
        <>
          <ThemedText style={styles.title}>Host tools are locked on this property</ThemedText>
          <ThemedText style={[styles.body, { color: colors.textMuted }]}>
            Upgrade to Maison Pro to unlock invites, documents, availability, and stay approvals on
            estates you sponsor.
          </ThemedText>
          <SecondaryButton
            label="Upgrade to Maison Pro"
            onPress={() => openUpgradePaywall(sponsorUpgradeFeature)}
          />
        </>
      ) : (
        <>
          <ThemedText style={styles.title}>Management is paused</ThemedText>
          <ThemedText style={[styles.body, { color: colors.textMuted }]}>
            {coverage.sponsorDisplayName}&apos;s subscription has ended. Documents and invites stay
            visible; writes are blocked until sponsorship is restored.
          </ThemedText>
          {canTransfer ? (
            busy ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <PrimaryButton label="Take over sponsorship" onPress={onTransfer} />
            )
          ) : (
            <SecondaryButton
              label="Upgrade to take over"
              onPress={() => openUpgradePaywall('generic')}
            />
          )}
          {error ? (
            <ThemedText style={[styles.error, { color: '#b42318' }]}>{error}</ThemedText>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
    marginBottom: 8,
  },
  title: { fontSize: 15, fontWeight: '700' },
  body: { fontSize: 13, lineHeight: 18 },
  error: { fontSize: 12 },
});
