import { StyleSheet, Text, View } from 'react-native';

import { GroupedList, useScreenTheme } from '@/components/ui/screen-layout';
import { Layout } from '@/constants/theme';

import { MC } from '../paywall-tokens';

interface ExitOfferCardProps {
  badge: string;
  price: string;
  /** Optional helper under the price; omit when copy is not a price. */
  period?: string;
}

export function ExitOfferCard({ badge, price, period }: ExitOfferCardProps) {
  const { colors } = useScreenTheme();

  return (
    <GroupedList style={[styles.card, { borderColor: colors.tint }]}>
      <View style={styles.inner}>
        <View style={[styles.badge, { backgroundColor: colors.tint }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
        <Text style={[styles.price, { color: colors.tint }]}>{price}</Text>
        {period ? <Text style={[styles.period, { color: colors.tint }]}>{period}</Text> : null}
      </View>
    </GroupedList>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  inner: {
    paddingVertical: 24,
    paddingHorizontal: Layout.screenPaddingX - 14,
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: 0.2,
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    letterSpacing: -0.5,
  },
  period: {
    fontSize: 13,
    fontFamily: 'Manrope_400Regular',
    opacity: 0.7,
  },
});
