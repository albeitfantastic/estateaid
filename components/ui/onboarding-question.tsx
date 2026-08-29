import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@/theme/useAppTheme';

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
  const appTheme = useAppTheme();
  const colors = appTheme.colors;

  // #region agent log
  fetch('http://127.0.0.1:7410/ingest/3b21f73e-4d1e-45e8-beb0-f14c26a6554d', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '1393f3' },
    body: JSON.stringify({
      sessionId: '1393f3',
      runId: 'pre-fix',
      hypothesisId: 'A',
      location: 'onboarding-question.tsx:colors',
      message: 'onboarding theme color keys',
      data: {
        hasTextSecondary: 'textSecondary' in colors,
        hasTextMuted: 'textMuted' in colors,
        textMuted: colors.textMuted ?? null,
        mutedUsedForLabels: true,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.progressRow}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressSegment,
              { backgroundColor: i < step ? colors.primary : colors.border },
            ]}
          />
        ))}
      </View>

      <View style={styles.content}>
        <Text style={[styles.stepLabel, { color: colors.textMuted }]}>{t('onboardingUi.stepOf', { step, total })}</Text>
        <Text style={[styles.question, { color: colors.text }]}>{question}</Text>
        {hint && <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text>}

        <View style={styles.options}>
          {options.map((label, i) => {
            const selected = selectedIndex === i;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.option,
                  { borderColor: colors.border, backgroundColor: colors.card },
                  appTheme.shadows.sm,
                  selected && {
                    borderColor: colors.primary,
                    borderWidth: 1.5,
                    backgroundColor: colors.primarySoft,
                  },
                ]}
                onPress={() => onSelect(i)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    selected && { color: colors.primary, fontFamily: 'Manrope_600SemiBold', fontWeight: '600' },
                  ]}
                >
                  {label}
                </Text>
                <View
                  style={[
                    styles.radio,
                    { borderColor: colors.border },
                    selected && { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                  ]}
                >
                  {selected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.btn,
            {
              backgroundColor: selectedIndex === null ? colors.surface : colors.primary,
            },
            selectedIndex === null ? styles.btnDisabled : appTheme.shadows.md,
          ]}
          onPress={onContinue}
          disabled={selectedIndex === null}
          activeOpacity={0.82}
        >
          <Text style={[styles.btnText, selectedIndex === null && { color: colors.textMuted }]}>
            {t('onboardingUi.continue')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 999,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 36,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Manrope_400Regular',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 16,
    opacity: 0.9,
  },
  question: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.5,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 8,
  },
  hint: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Manrope_400Regular',
    marginBottom: 32,
  },
  options: {
    marginTop: 28,
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Manrope_400Regular',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  btn: {
    borderRadius: 20,
    minHeight: 44,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.1,
  },
});
