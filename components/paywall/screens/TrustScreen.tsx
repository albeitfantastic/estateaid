import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaywallHeader } from '../ui/PaywallHeader';
import { ProofCard } from '../ui/ProofCard';
import { PrimaryButton } from '../ui/PrimaryButton';
import { MC } from '../paywall-tokens';
import {
  TESTIMONIALS,
  TRUST_BODY,
  TRUST_TITLE,
} from '../paywall-mock-data';

interface TrustScreenProps {
  onContinue: () => void;
}

export function TrustScreen({ onContinue }: TrustScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <PaywallHeader topInset={insets.top} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{TRUST_TITLE}</Text>
        <Text style={styles.body}>{TRUST_BODY}</Text>

        <View style={styles.cards}>
          {TESTIMONIALS.map((t, i) => (
            <ProofCard key={i} quote={t.quote} />
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton label="Continue" onPress={onContinue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: MC.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: MC.hPad,
    paddingTop: 8,
    paddingBottom: 24,
    gap: MC.sectionGap,
  },
  title: {
    fontSize: MC.sectionTitle,
    fontWeight: '700',
    color: MC.text,
    lineHeight: 36,
    letterSpacing: -0.3,
    fontFamily: 'Manrope_700Bold',
  },
  body: {
    fontSize: MC.body,
    color: MC.textSecondary,
    lineHeight: 26,
    fontFamily: 'Manrope_400Regular',
    marginTop: -MC.sectionGap + MC.titleBodyGap,
  },
  cards: {
    gap: MC.cardGap,
  },
  footer: {
    paddingHorizontal: MC.hPad,
    paddingTop: MC.aboveCta,
    backgroundColor: MC.bg,
  },
});
