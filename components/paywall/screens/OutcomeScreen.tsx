import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaywallHeader } from '../ui/PaywallHeader';
import { PrimaryButton } from '../ui/PrimaryButton';
import { SecondaryButton } from '../ui/SecondaryButton';
import { MC } from '../paywall-tokens';
import { OUTCOME_BODY, OUTCOME_TITLE } from '../paywall-mock-data';

interface OutcomeScreenProps {
  onStartTrial: () => void;
  /** User taps "Maybe later" — triggers exit offer */
  onMaybeLater: () => void;
  onClose: () => void;
}

export function OutcomeScreen({ onStartTrial, onMaybeLater, onClose }: OutcomeScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <PaywallHeader onClose={onClose} topInset={insets.top} />

      {/* Content centred vertically */}
      <View style={styles.body}>
        <Text style={styles.title}>{OUTCOME_TITLE}</Text>
        <Text style={styles.paragraph}>{OUTCOME_BODY}</Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton label="Start free trial" onPress={onStartTrial} />
        <SecondaryButton label="Maybe later" onPress={onMaybeLater} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: MC.bg,
  },
  body: {
    flex: 1,
    paddingHorizontal: MC.hPad,
    justifyContent: 'center',
    gap: MC.titleBodyGap + 4,
  },
  title: {
    fontSize: MC.largeTitle,
    fontWeight: '700',
    color: MC.text,
    lineHeight: 42,
    letterSpacing: -0.5,
    fontFamily: 'Manrope_700Bold',
  },
  paragraph: {
    fontSize: MC.body,
    color: MC.textSecondary,
    lineHeight: 28,
    fontFamily: 'Manrope_400Regular',
  },
  footer: {
    paddingHorizontal: MC.hPad,
    paddingTop: MC.aboveCta,
    backgroundColor: MC.bg,
    gap: 4,
  },
});
