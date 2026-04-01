import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const C = {
  bg: '#F4F4F2',
  navy: '#2C554E',
  gold: '#607D8B',
  text: '#1A2B28',
  muted: '#607D8B',
  border: '#DDE1E0',
  surface: '#FFFFFF',
};

interface OnboardingQuestionProps {
  step: number;
  total: number;
  question: string;
  hint?: string;
  options: string[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onContinue: () => void;
}

export function OnboardingQuestion({
  step,
  total,
  question,
  hint,
  options,
  selectedIndex,
  onSelect,
  onContinue,
}: OnboardingQuestionProps) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.safe}>
      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i < step ? styles.dotFilled : styles.dotEmpty]}
          />
        ))}
      </View>

      <View style={styles.content}>
        <Text style={styles.stepLabel}>{t('onboardingUi.stepOf', { step, total })}</Text>
        <Text style={styles.question}>{question}</Text>
        {hint && <Text style={styles.hint}>{hint}</Text>}

        <View style={styles.options}>
          {options.map((label, i) => {
            const selected = selectedIndex === i;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => onSelect(i)}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {label}
                </Text>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, selectedIndex === null && styles.btnDisabled]}
          onPress={onContinue}
          disabled={selectedIndex === null}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>{t('onboardingUi.continue')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  dot: {
    width: 32,
    height: 4,
    borderRadius: 2,
  },
  dotFilled: { backgroundColor: C.navy },
  dotEmpty: { backgroundColor: C.border },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  stepLabel: {
    fontSize: 13,
    color: C.muted,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  question: {
    fontSize: 28,
    fontWeight: '700',
    color: C.text,
    lineHeight: 36,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  hint: {
    fontSize: 15,
    color: C.muted,
    lineHeight: 22,
    marginBottom: 32,
  },
  options: {
    marginTop: 24,
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 12,
  },
  optionSelected: {
    borderColor: C.navy,
    backgroundColor: '#EBF2F0',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: C.text,
    lineHeight: 22,
  },
  optionTextSelected: {
    color: C.navy,
    fontWeight: '600',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: C.navy,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.navy,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  btn: {
    backgroundColor: C.navy,
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnDisabled: {
    backgroundColor: C.border,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
