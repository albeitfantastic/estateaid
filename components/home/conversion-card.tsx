import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { FilledButton, OutlineButton, useScreenTheme } from '@/components/ui/screen-layout';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Radius } from '@/constants/theme';
import type { ConversionInventory, ConversionKind } from '@/lib/conversion-moments';
import { SLOT_PACKS } from '@/lib/subscription-config';

type Props = {
  kind: ConversionKind;
  inventory: ConversionInventory;
  propertyName: string;
  onChoosePlan: () => void;
  onDismiss?: () => void;
};

export function ConversionCard({
  kind,
  inventory,
  propertyName,
  onChoosePlan,
  onDismiss,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useScreenTheme();
  const price = SLOT_PACKS.home.annualEur.toFixed(2);
  const inventoryLine = t('conversion.inventory', {
    documents: inventory.documents,
    contacts: inventory.contacts,
    guests: inventory.guests,
    days: inventory.daysBlocked,
  });
  const pitch = t('conversion.keepManaging', { name: propertyName, price });

  const title =
    kind === 'invite_accepted'
      ? t('conversion.inviteTitle')
      : kind === 'day11'
        ? t('conversion.day11Title')
        : t('conversion.expiryTitle');

  const body =
    kind === 'invite_accepted'
      ? t('conversion.inviteBody')
      : kind === 'expiry'
        ? t('conversion.expiryBody')
        : null;

  return (
    <SurfaceCard variant="outline" padded style={styles.card}>
      <ThemedText type="defaultSemiBold" style={styles.title}>
        {title}
      </ThemedText>
      {body ? (
        <ThemedText style={[styles.body, { color: colors.textSecondary }]}>{body}</ThemedText>
      ) : null}
      <ThemedText style={[styles.inventory, { color: colors.text }]}>{inventoryLine}</ThemedText>
      <ThemedText style={[styles.pitch, { color: colors.tint }]}>{pitch}</ThemedText>
      <View style={styles.actions}>
        <FilledButton tone="accent" label={t('conversion.choosePlan')} onPress={onChoosePlan} />
        {onDismiss ? (
          <OutlineButton label={t('conversion.notNow')} onPress={onDismiss} />
        ) : null}
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 0, gap: 10, borderRadius: Radius.lg },
  title: { fontSize: 17, textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  inventory: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  pitch: { fontSize: 14, fontWeight: '600', lineHeight: 21, textAlign: 'center' },
  actions: { gap: 8, marginTop: 8 },
});
