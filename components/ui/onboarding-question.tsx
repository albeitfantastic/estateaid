import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors, Elevation, Fonts, Layout, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? 'light';
  const colors = Colors[scheme];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.progressRow}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressSegment,
              { backgroundColor: i < step ? colors.tint : colors.border },
            ]}
          />
        ))}
      </View>

      <View style={styles.content}>
        <Text style={[styles.stepLabel, { color: colors.textSecondary }]}>{t('onboardingUi.stepOf', { step, total })}</Text>
        <Text style={[styles.question, { color: colors.text }]}>{question}</Text>
        {hint && <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint}</Text>}

        <View style={styles.options}>
          {options.map((label, i) => {
            const selected = selectedIndex === i;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.option,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  Elevation.row[scheme],
                  selected && {
                    borderColor: colors.tint,
                    borderWidth: 1.5,
                    backgroundColor: colors.tint + '12',
                  },
                ]}
                onPress={() => onSelect(i)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    selected && { color: colors.tint, fontFamily: Fonts.headingSemiBold, fontWeight: '600' },
                  ]}
                >
                  {label}
                </Text>
                <View
                  style={[
                    styles.radio,
                    { borderColor: colors.icon + '44' },
                    selected && { borderColor: colors.tint, backgroundColor: colors.tint + '10' },
                  ]}
                >
                  {selected && <View style={[styles.radioInner, { backgroundColor: colors.tint }]} />}
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
              backgroundColor: selectedIndex === null ? colors.surfaceMuted : colors.tint,
            },
            selectedIndex === null ? styles.btnDisabled : Elevation.fab[scheme],
          ]}
          onPress={onContinue}
          disabled={selectedIndex === null}
          activeOpacity={0.82}
        >
          <Text style={[styles.btnText, selectedIndex === null && { color: colors.textSecondary }]}>
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
    paddingHorizontal: Layout.screenPaddingX,
    paddingTop: Layout.sectionGap,
    paddingBottom: 8,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: Radius.full,
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.screenPaddingX,
    paddingTop: 36,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Fonts.label,
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
    fontFamily: Fonts.heading,
    marginBottom: 8,
  },
  hint: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Fonts.body,
    marginBottom: 32,
  },
  options: {
    marginTop: 28,
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 18,
    paddingHorizontal: Layout.sectionGap,
    gap: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.body,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
  },
  footer: {
    paddingHorizontal: Layout.screenPaddingX,
    paddingBottom: Layout.sectionGap - 4,
  },
  btn: {
    borderRadius: Radius.lg,
    minHeight: Layout.touchMin,
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
    fontFamily: Fonts.heading,
    letterSpacing: 0.1,
  },
});
