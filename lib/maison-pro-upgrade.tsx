import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { MC } from '@/components/paywall/paywall-tokens';
import { PrimaryButton } from '@/components/paywall/ui/PrimaryButton';
import { SecondaryButton } from '@/components/paywall/ui/SecondaryButton';

export type UpgradeFeature =
  | 'estate.create'
  | 'estate.createAsCoOwner'
  | 'estate.createAdditional'
  | 'documents.upload'
  | 'guests.invite'
  | 'events.write'
  | 'availability.write'
  | 'stays.approve'
  | 'generic'
  | 'coverage_lapse';

const FEATURE_COPY: Record<UpgradeFeature, { title: string; body: string; source: string }> = {
  'estate.createAsCoOwner': {
    title: 'Manage your own property',
    body: 'You’ve already hosted on a shared estate. Maison Pro lets you sponsor your own — calendar, guests, and house tools included.',
    source: 'estate.createAsCoOwner',
  },
  'estate.create': {
    title: 'Add another property',
    body: 'Your current plan covers one estate. Upgrade to sponsor more properties under one calm system.',
    source: 'estate.create',
  },
  'estate.createAdditional': {
    title: 'Add more properties',
    body: 'Maison Pro unlocks multiple estates under one calm system.',
    source: 'estate.createAdditional',
  },
  'documents.upload': {
    title: 'Upload documents',
    body: 'Keep manuals, contracts, and house notes in one place with Maison Pro.',
    source: 'documents.upload',
  },
  'guests.invite': {
    title: 'Invite guests',
    body: 'Share invite links so family and friends can request stays themselves.',
    source: 'guests.invite',
  },
  'events.write': {
    title: 'Track maintenance',
    body: 'Log issues and scheduled upkeep across your properties with Maison Pro.',
    source: 'events.write',
  },
  'availability.write': {
    title: 'Set availability rules',
    body: 'Blackouts, closures, and booking windows — unlocked with Maison Pro.',
    source: 'availability.write',
  },
  'stays.approve': {
    title: 'Manage stay requests',
    body: 'Approve, decline, or propose alternate dates with Maison Pro.',
    source: 'stays.approve',
  },
  generic: {
    title: 'Maison Pro',
    body: 'Upgrade to unpause host tools for your properties.',
    source: 'generic',
  },
  coverage_lapse: {
    title: 'Management is paused',
    body: 'Everything you added is still here. Choose a plan to keep writing — nothing is charged until you subscribe.',
    source: 'coverage_lapse',
  },
};

type SheetState = { feature: UpgradeFeature; returnTo?: string } | null;

let openSheet: ((feature: UpgradeFeature, returnTo?: string) => void) | null = null;

/** Imperative API for non-React call sites (EmptyState callbacks, etc.). */
export function showMaisonProUpgradePrompt(
  _t?: unknown,
  feature: UpgradeFeature = 'generic',
  returnTo?: string
): void {
  openSheet?.(feature, returnTo);
}

export function openUpgradePaywall(feature: UpgradeFeature, returnTo?: string) {
  openSheet?.(feature, returnTo);
}

/** Pick create-estate pitch: co-owner path is the strongest signal. */
export function openEstateCreatePaywall(opts: {
  isCoOwnerElsewhere: boolean;
  returnTo?: string;
}) {
  openUpgradePaywall(
    opts.isCoOwnerElsewhere ? 'estate.createAsCoOwner' : 'estate.create',
    opts.returnTo ?? '/(app)/estates'
  );
}

export function buildPaywallTrustHref(source: string, returnTo?: string) {
  const q = new URLSearchParams({ source });
  if (returnTo) q.set('returnTo', returnTo);
  return `/(app)/settings/paywall-trust?${q.toString()}`;
}

export function UpgradeSheetHost() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState<SheetState>(null);

  openSheet = useCallback((feature: UpgradeFeature, returnTo?: string) => {
    setSheet({ feature, returnTo });
  }, []);

  const copy = useMemo(
    () => FEATURE_COPY[sheet?.feature ?? 'generic'],
    [sheet?.feature]
  );

  function close() {
    setSheet(null);
  }

  function onUpgrade() {
    const returnTo = sheet?.returnTo;
    const href = buildPaywallTrustHref(copy.source, returnTo);
    close();
    router.push(href as never);
  }

  return (
    <Modal visible={sheet != null} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>
        <PrimaryButton
          label={t('access.upgradeCta', { defaultValue: 'Choose a plan' })}
          onPress={onUpgrade}
        />
        <SecondaryButton label={t('access.notNow', { defaultValue: 'Not now' })} onPress={close} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: MC.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: MC.hPad,
    paddingTop: 24,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: MC.text,
    fontFamily: 'Manrope_700Bold',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: MC.textSecondary,
    fontFamily: 'Manrope_400Regular',
    marginBottom: 8,
  },
});
