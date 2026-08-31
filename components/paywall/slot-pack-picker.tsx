import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MC } from '@/components/paywall/paywall-tokens';
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
  return (
    <View style={styles.wrap}>
      <View style={styles.billingRow}>
        <Pressable
          onPress={() => onSelectBilling('annual')}
          style={[styles.billingChip, billing === 'annual' && styles.billingOn]}
        >
          <Text style={[styles.billingText, billing === 'annual' && styles.billingTextOn]}>Annual</Text>
        </Pressable>
        <Pressable
          onPress={() => onSelectBilling('monthly')}
          style={[styles.billingChip, billing === 'monthly' && styles.billingOn]}
        >
          <Text style={[styles.billingText, billing === 'monthly' && styles.billingTextOn]}>Monthly</Text>
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
            style={[styles.card, on && styles.cardOn, primary && styles.cardPrimary]}
          >
            <View style={styles.cardTop}>
              <Text style={styles.packName}>{pack.displayName}</Text>
              <Text style={styles.slots}>
                {pack.slots} {pack.slots === 1 ? 'property' : 'properties'}
              </Text>
            </View>
            <Text style={styles.price}>
              €{price.toFixed(2)}
              <Text style={styles.per}>/{billing === 'annual' ? 'year' : 'month'}</Text>
            </Text>
            <Text style={styles.perProp}>€{pack.perPropertyYearEur}/property/year</Text>
          </Pressable>
        );
      })}

      <Text style={styles.contact}>
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: MC.border,
    alignItems: 'center',
  },
  billingOn: { borderColor: MC.brand, backgroundColor: 'rgba(35,69,54,0.08)' },
  billingText: { fontSize: 14, color: MC.textSecondary, fontWeight: '600' },
  billingTextOn: { color: MC.brand },
  card: {
    borderWidth: 1,
    borderColor: MC.border,
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  cardOn: { borderColor: MC.brand, borderWidth: 2 },
  cardPrimary: { backgroundColor: 'rgba(35,69,54,0.04)' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packName: { fontSize: 18, fontWeight: '700', color: MC.text },
  slots: { fontSize: 13, color: MC.textSecondary },
  price: { fontSize: 22, fontWeight: '700', color: MC.text, marginTop: 4 },
  per: { fontSize: 14, fontWeight: '500', color: MC.textSecondary },
  perProp: { fontSize: 14, color: MC.brand, fontWeight: '600', marginTop: 2 },
  contact: { fontSize: 12, color: MC.textSecondary, textAlign: 'center', marginTop: 8 },
});
