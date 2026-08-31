import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/paywall/ui/PrimaryButton';
import { SecondaryButton } from '@/components/paywall/ui/SecondaryButton';
import { useAccountContext } from '@/lib/entitlements/capabilities';
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
 * Owners never see a generic "Upgrade" for someone else's lapse.
 */
export function SponsorCoverageBanner({
  estateId,
  sponsorUpgradeFeature = 'generic',
}: Props) {
  const { t } = useTranslation();
  const colors = useAppTheme().colors;
  const account = useAccountContext();
  const coverage = useEstateCoverageStore((s) => s.byId[estateId]);
  const transferSponsor = useEstateStore((s) => s.transferSponsor);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!coverage || coverage.covered) return null;
  if (coverage.actorRole !== 'sponsor' && coverage.actorRole !== 'owner') return null;

  const isSponsor = coverage.actorRole === 'sponsor';
  const canTransfer =
    !isSponsor && account.slotCount > account.propertiesSponsored;
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
          <ThemedText style={styles.title}>{t('coverageBanner.pausedTitle')}</ThemedText>
          <ThemedText style={[styles.body, { color: colors.textMuted }]}>
            {t('coverageBanner.sponsorBody')}
          </ThemedText>
          <PrimaryButton
            label={t('coverageBanner.choosePlan')}
            onPress={() => openUpgradePaywall(sponsorUpgradeFeature)}
          />
        </>
      ) : (
        <>
          <ThemedText style={styles.title}>{t('coverageBanner.pausedTitle')}</ThemedText>
          <ThemedText style={[styles.body, { color: colors.textMuted }]}>
            {t('coverageBanner.ownerBody', { name: coverage.sponsorDisplayName })}
          </ThemedText>
          {canTransfer ? (
            busy ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <PrimaryButton label={t('coverageBanner.takeOver')} onPress={onTransfer} />
            )
          ) : (
            <SecondaryButton
              label={t('coverageBanner.upgradeToTakeOver')}
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
