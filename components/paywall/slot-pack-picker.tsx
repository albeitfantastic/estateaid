import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useScreenTheme } from '@/components/ui/screen-layout';
import { Radius } from '@/constants/theme';
import { SLOT_PACKS, type SlotPackId } from '@/lib/subscription-config';

type Props = {
  selected: SlotPackId;
  billing: 'annual' | 'monthly';
  onSelectPack: (id: SlotPackId) => void;
  onSelectBilling: (b: 'annual' | 'monthly') => void;
};

const ORDER: SlotPackId[] = ['home', 'family', 'portfolio'];

/** Three slot packs; annual default; Family visually primary (§2.2). */
export function SlotPackPicker({ selected, billing, onSelectPack, onSelectBilling }: Props) {
  const { colors } = useScreenTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.billingRow}>
        <Pressable
          onPress={() => onSelectBilling('annual')}
          style={[
            styles.billingChip,
            { borderColor: billing === 'annual' ? colors.tint : colors.border },
            billing === 'annual' && { backgroundColor: colors.tint + '14' },
          ]}
        >
          <Text
            style={[
              styles.billingText,
              { color: billing === 'annual' ? colors.tint : colors.textSecondary },
            ]}
          >
            Annual
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onSelectBilling('monthly')}
          style={[
            styles.billingChip,
            { borderColor: billing === 'monthly' ? colors.tint : colors.border },
            billing === 'monthly' && { backgroundColor: colors.tint + '14' },
          ]}
        >
          <Text
            style={[
              styles.billingText,
              { color: billing === 'monthly' ? colors.tint : colors.textSecondary },
            ]}
          >
            Monthly
          </Text>
        </Pressable>
      </View>

      {ORDER.map((id) => {
        const pack = SLOT_PACKS[id];
        const on = selected === id;
        const primary = id === 'family';
        const price = billing === 'annual' ? pack.annualEur : pack.monthlyEur;
        return (
          <Pressable
            key={id}
            onPress={() => onSelectPack(id)}
            style={[
              styles.card,
              { borderColor: on ? colors.tint : colors.border, borderWidth: on ? 2 : 1 },
              primary && { backgroundColor: colors.tint + '0A' },
            ]}
          >
            <View style={styles.cardTop}>
              <Text style={[styles.packName, { color: colors.text }]}>{pack.displayName}</Text>
              <Text style={[styles.slots, { color: colors.textSecondary }]}>
                {pack.slots} {pack.slots === 1 ? 'property' : 'properties'}
              </Text>
            </View>
            <Text style={[styles.price, { color: colors.text }]}>
              €{price.toFixed(2)}
              <Text style={[styles.per, { color: colors.textSecondary }]}>
                /{billing === 'annual' ? 'year' : 'month'}
              </Text>
            </Text>
            <Text style={[styles.perProp, { color: colors.tint }]}>€{pack.perPropertyYearEur}/property/year</Text>
          </Pressable>
        );
      })}

      <Text style={[styles.contact, { color: colors.textSecondary }]}>
        Need more than 10 properties? Contact support@estateaid.app
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  billingRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  billingChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  billingText: { fontSize: 14, fontWeight: '600' },
  card: {
    borderRadius: Radius.lg,
    padding: 16,
    gap: 4,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packName: { fontSize: 18, fontWeight: '700' },
  slots: { fontSize: 13 },
  price: { fontSize: 22, fontWeight: '700', marginTop: 4 },
  per: { fontSize: 14, fontWeight: '500' },
  perProp: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  contact: { fontSize: 12, textAlign: 'center', marginTop: 8 },
});
