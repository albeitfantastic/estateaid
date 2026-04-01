import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaywallHeader } from '../ui/PaywallHeader';
import { TimelineStep } from '../ui/TimelineStep';
import { PrimaryButton } from '../ui/PrimaryButton';
import { MC } from '../paywall-tokens';
import {
  TIMELINE_STEPS,
  TRIAL_REASSURANCES,
  TRIAL_TITLE,
} from '../paywall-mock-data';

interface TrialClarityScreenProps {
  onContinue: () => void;
  onClose: () => void;
}

export function TrialClarityScreen({ onContinue, onClose }: TrialClarityScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <PaywallHeader onClose={onClose} topInset={insets.top} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{TRIAL_TITLE}</Text>

        {/* Timeline */}
        <View style={styles.timeline}>
          {TIMELINE_STEPS.map((step, i) => (
            <TimelineStep
              key={i}
              heading={step.heading}
              body={step.body}
              isLast={i === TIMELINE_STEPS.length - 1}
            />
          ))}
        </View>

        {/* Reassurances */}
        <View style={styles.reassuranceBox}>
          {TRIAL_REASSURANCES.map((r, i) => (
            <View key={i} style={styles.reassuranceRow}>
              <Text style={styles.checkmark}>✓</Text>
              <Text style={styles.reassuranceText}>{r.label}</Text>
            </View>
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
  timeline: {
    // no extra gap — handled internally by TimelineStep
  },
  reassuranceBox: {
    backgroundColor: MC.surface,
    borderRadius: MC.cardRadius,
    borderWidth: 1,
    borderColor: MC.border,
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 12,
  },
  reassuranceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkmark: {
    fontSize: 15,
    color: MC.brand,
    fontWeight: '700',
    width: 18,
    textAlign: 'center',
  },
  reassuranceText: {
    fontSize: MC.body,
    color: MC.text,
    fontFamily: 'Manrope_400Regular',
  },
  footer: {
    paddingHorizontal: MC.hPad,
    paddingTop: MC.aboveCta,
    backgroundColor: MC.bg,
  },
});
