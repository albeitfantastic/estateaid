import { StyleSheet, Text, View } from 'react-native';
import { MC } from '../paywall-tokens';

interface BenefitRowProps {
  label: string;
}

export function BenefitRow({ label }: BenefitRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.dot} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: MC.brand,
    flexShrink: 0,
  },
  label: {
    fontSize: MC.body,
    color: MC.text,
    lineHeight: 24,
    fontFamily: 'Manrope_400Regular',
    flex: 1,
  },
});
