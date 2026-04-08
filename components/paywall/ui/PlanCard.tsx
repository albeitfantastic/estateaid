import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Plan } from '../paywall-types';
import { MC } from '../paywall-tokens';

interface PlanCardProps {
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
}

export function PlanCard({ plan, selected, onSelect }: PlanCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        selected && styles.cardSelected,
      ]}
      onPress={onSelect}
      activeOpacity={0.75}
    >
      {plan.badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{plan.badge}</Text>
        </View>
      )}

      <Text style={[styles.title, selected && styles.titleSelected]}>
        {plan.title}
      </Text>

      <Text style={[styles.price, selected && styles.priceSelected]}>
        {plan.priceLabel}
      </Text>

      {plan.helper && (
        <Text style={[styles.helper, selected && styles.helperSelected]}>
          {plan.helper}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: MC.cardRadius,
    borderWidth: 1.5,
    borderColor: MC.border,
    backgroundColor: MC.surface,
    paddingVertical: 18,
    paddingHorizontal: 14,
    minHeight: 100,
    justifyContent: 'center',
    gap: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: MC.brand,
    backgroundColor: MC.tint,
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: MC.brand,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: MC.textSecondary,
    fontFamily: 'Manrope_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleSelected: {
    color: MC.brand,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: MC.text,
    fontFamily: 'Manrope_700Bold',
    marginTop: 2,
  },
  priceSelected: {
    color: MC.brand,
  },
  helper: {
    fontSize: 12,
    color: MC.textSecondary,
    fontFamily: 'Manrope_400Regular',
  },
  helperSelected: {
    color: MC.brand,
    opacity: 0.75,
  },
});
