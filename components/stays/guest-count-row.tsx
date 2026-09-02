import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GroupedList, GroupedRow, useScreenTheme } from '@/components/ui/screen-layout';

export const MIN_GUEST_COUNT = 1;
export const MAX_GUEST_COUNT = 20;

type GuestCountRowProps = {
  value: number;
  onChange: (next: number) => void;
  hint?: string;
  min?: number;
};

export function GuestCountRow({ value, onChange, hint, min = MIN_GUEST_COUNT }: GuestCountRowProps) {
  const { t } = useTranslation();
  const { colors } = useScreenTheme();
  const floor = Math.max(MIN_GUEST_COUNT, min);
  const atMin = value <= floor;
  const atMax = value >= MAX_GUEST_COUNT;

  return (
    <GroupedList>
      <GroupedRow
        icon="person.2.fill"
        title={t('requestDates.guestCountLabel')}
        subtitle={hint ?? t('requestDates.guestCountHint')}
        trailing={
          <View style={styles.stepper}>
            <TouchableOpacity
              style={[styles.stepperBtn, { backgroundColor: colors.tintMuted }]}
              onPress={() => onChange(Math.max(floor, value - 1))}
              disabled={atMin}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('requestDates.guestCountDecrease')}
            >
              <IconSymbol name="minus" size={16} color={atMin ? colors.icon : colors.tint} />
            </TouchableOpacity>
            <ThemedText type="defaultSemiBold" style={styles.stepperValue}>
              {value}
            </ThemedText>
            <TouchableOpacity
              style={[styles.stepperBtn, { backgroundColor: colors.tintMuted }]}
              onPress={() => onChange(Math.min(MAX_GUEST_COUNT, value + 1))}
              disabled={atMax}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('requestDates.guestCountIncrease')}
            >
              <IconSymbol name="plus" size={16} color={atMax ? colors.icon : colors.tint} />
            </TouchableOpacity>
          </View>
        }
        isLast
      />
    </GroupedList>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { fontSize: 18, minWidth: 28, textAlign: 'center' },
});
