import { StyleSheet, Text, View } from 'react-native';

import { Layout } from '@/constants/theme';

import { MC } from '../paywall-tokens';

interface ExitOfferCardProps {
  badge: string;
  price: string;
}

export function ExitOfferCard({ badge, price }: ExitOfferCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
      <Text style={styles.price}>{price}</Text>
      <Text style={styles.period}>billed annually</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: MC.cardRadius,
    borderWidth: 1.5,
    borderColor: MC.brand,
    backgroundColor: MC.tint,
    paddingVertical: 24,
    paddingHorizontal: Layout.screenPaddingX,
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    backgroundColor: MC.brand,
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
    color: MC.brand,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: -0.5,
  },
  period: {
    fontSize: 13,
    color: MC.brand,
    fontFamily: 'Manrope_400Regular',
    opacity: 0.7,
  },
});
