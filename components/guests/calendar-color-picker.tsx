import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useScreenTheme } from '@/components/ui/screen-layout';
import { GUEST_CALENDAR_PALETTE } from '@/lib/guest-calendar-color';

type CalendarColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
};

export function CalendarColorPicker({ value, onChange, disabled }: CalendarColorPickerProps) {
  const { colors } = useScreenTheme();
  return (
    <View style={styles.row}>
      {GUEST_CALENDAR_PALETTE.map((c) => {
        const selected = c.toLowerCase() === value.toLowerCase();
        return (
          <TouchableOpacity
            key={c}
            style={[
              styles.dot,
              { backgroundColor: c, borderColor: selected ? colors.text : 'transparent' },
              selected && styles.dotSelected,
            ]}
            onPress={() => {
              if (!disabled) onChange(c);
            }}
            disabled={disabled}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: !!disabled }}
            accessibilityLabel={c}
          />
        );
      })}
    </View>
  );
}

export function CalendarColorHint({ children }: { children: string }) {
  const { colors } = useScreenTheme();
  return <ThemedText style={[styles.hint, { color: colors.textSecondary }]}>{children}</ThemedText>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
  },
  dotSelected: { transform: [{ scale: 1.06 }] },
  hint: { fontSize: 13, lineHeight: 18 },
});
