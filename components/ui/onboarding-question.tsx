import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import {
  GroupedList,
  GroupedRow,
  ScreenScroll,
  ScreenShell,
  useScreenTheme,
} from '@/components/ui/screen-layout';

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

function ProgressHeader({ step, total }: { step: number; total: number }) {
  const { colors } = useScreenTheme();
  return (
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
  );
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
  const { colors, cardShadow } = useScreenTheme();

  return (
    <ScreenShell showBack={false} title={<ProgressHeader step={step} total={total} />}>
      <ScreenScroll contentContainerStyle={styles.scroll} gap={16}>
        <ThemedText style={[styles.stepLabel, { color: colors.textSecondary }]}>
          {t('onboardingUi.stepOf', { step, total })}
        </ThemedText>
        <ThemedText type="title" style={styles.question}>
          {question}
        </ThemedText>
        {hint ? (
          <ThemedText style={[styles.hint, { color: colors.textSecondary }]}>{hint}</ThemedText>
        ) : null}

        <GroupedList style={cardShadow}>
          {options.map((label, i) => {
            const selected = selectedIndex === i;
            return (
              <GroupedRow
                key={i}
                title={label}
                onPress={() => onSelect(i)}
                isLast={i === options.length - 1}
                trailing={
                  <View
                    style={[
                      styles.radio,
                      { borderColor: colors.border },
                      selected && { borderColor: colors.tint, backgroundColor: colors.tint + '12' },
                    ]}
                  >
                    {selected ? (
                      <View style={[styles.radioInner, { backgroundColor: colors.tint }]} />
                    ) : null}
                  </View>
                }
              />
            );
          })}
        </GroupedList>

        <TouchableOpacity
          style={[
            styles.btn,
            {
              backgroundColor: selectedIndex === null ? colors.surfaceMuted : colors.tint,
            },
            selectedIndex !== null && cardShadow,
          ]}
          onPress={onContinue}
          disabled={selectedIndex === null}
          activeOpacity={0.82}
        >
          <ThemedText
            style={[
              styles.btnText,
              selectedIndex === null && { color: colors.textSecondary },
            ]}
          >
            {t('onboardingUi.continue')}
          </ThemedText>
        </TouchableOpacity>
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 999,
  },
  scroll: {
    paddingTop: 24,
    flexGrow: 1,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  question: {
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  hint: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
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
  btn: {
    borderRadius: 14,
    minHeight: 44,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});
