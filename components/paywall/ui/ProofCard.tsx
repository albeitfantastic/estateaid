import { StyleSheet, Text, View } from 'react-native';
import { MC } from '../paywall-tokens';

interface ProofCardProps {
  quote: string;
}

export function ProofCard({ quote }: ProofCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.quote}>"{quote}"</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: MC.surface,
    borderRadius: MC.cardRadius,
    borderWidth: 1,
    borderColor: MC.border,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  quote: {
    fontSize: MC.body,
    color: MC.text,
    lineHeight: 24,
    fontStyle: 'italic',
    fontFamily: 'Manrope_400Regular',
  },
});
