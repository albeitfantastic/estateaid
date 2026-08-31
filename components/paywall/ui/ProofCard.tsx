import { StyleSheet, Text, View } from 'react-native';

import { useScreenTheme } from '@/components/ui/screen-layout';

import { MC } from '../paywall-tokens';

interface ProofCardProps {
  quote: string;
  isLast?: boolean;
}

export function ProofCard({ quote, isLast = true }: ProofCardProps) {
  const { colors, borderHairline } = useScreenTheme();

  return (
    <View
      style={[
        styles.card,
        !isLast && { borderBottomColor: colors.border, borderBottomWidth: borderHairline },
      ]}
    >
      <Text style={[styles.mark, { color: colors.tint }]}>&ldquo;</Text>
      <Text style={[styles.quote, { color: colors.text }]}>{quote}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 20,
    paddingHorizontal: 14,
    gap: 6,
  },
  mark: {
    fontSize: 28,
    lineHeight: 24,
    opacity: 0.35,
    fontFamily: 'Manrope_700Bold',
  },
  quote: {
    fontSize: MC.body,
    lineHeight: 26,
    fontFamily: 'Manrope_400Regular',
  },
});
