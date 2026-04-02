import { StyleSheet, Text, View } from 'react-native';

import { Layout } from '@/constants/theme';

import { MC } from '../paywall-tokens';

interface ProofCardProps {
  quote: string;
}

export function ProofCard({ quote }: ProofCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.mark}>"</Text>
      <Text style={styles.quote}>{quote}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: MC.surface,
    borderRadius: MC.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: MC.border,
    paddingVertical: 20,
    paddingHorizontal: Layout.screenPaddingX,
    shadowColor: '#1E1E1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 6,
  },
  mark: {
    fontSize: 28,
    lineHeight: 24,
    color: MC.brand,
    opacity: 0.35,
    fontFamily: 'Manrope_700Bold',
  },
  quote: {
    fontSize: MC.body,
    color: MC.text,
    lineHeight: 26,
    fontFamily: 'Manrope_400Regular',
  },
});
