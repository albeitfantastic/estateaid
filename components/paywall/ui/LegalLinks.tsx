import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MC } from '../paywall-tokens';

interface LegalLinksProps {
  onPrivacy?: () => void;
  onTerms?: () => void;
}

export function LegalLinks({ onPrivacy, onTerms }: LegalLinksProps) {
  return (
    <View style={styles.row}>
      <TouchableOpacity onPress={onPrivacy} activeOpacity={0.7}>
        <Text style={styles.link}>Privacy Policy</Text>
      </TouchableOpacity>
      <Text style={styles.separator}>·</Text>
      <TouchableOpacity onPress={onTerms} activeOpacity={0.7}>
        <Text style={styles.link}>Terms of Service</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  link: {
    fontSize: 12,
    color: MC.textSecondary,
    fontFamily: 'Manrope_400Regular',
    opacity: 0.75,
  },
  separator: {
    fontSize: 12,
    color: MC.textSecondary,
    opacity: 0.5,
  },
});
