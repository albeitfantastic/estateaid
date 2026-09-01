import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CalendarColors } from '@/constants/theme';
import { useAppTheme } from '@/theme/useAppTheme';

export interface DotData {
  color: string;
  key: string;
}

export type DayAvailability = 'available' | 'blocked' | 'my-stay' | 'unavailable';

interface DayCellProps {
  day: number;
  isToday: boolean;
  dots?: DotData[];
  availability?: DayAvailability;
  occupancyColor?: string;
  selected?: boolean;
  onPress?: () => void;
}

export function DayCell({
  day,
  isToday,
  dots,
  availability,
  occupancyColor,
  selected,
  onPress,
}: DayCellProps) {
  const t = useAppTheme();
  const colors = t.colors;
  const cal = CalendarColors[t.scheme === 'dark' ? 'dark' : 'light'];

  const blocked = availability === 'blocked';
  const occupiedTint = blocked && !!occupancyColor;
  const myStay = availability === 'my-stay';
  const unavailable = availability === 'unavailable';
  const filled = myStay || occupiedTint || (blocked && !occupiedTint);
  const faded = unavailable && !selected;

  const todayRing =
    isToday && !selected && !filled
      ? { borderWidth: 1.5, borderColor: colors.text }
      : null;

  const selectedRing = selected
    ? {
        borderWidth: 2,
        borderColor: colors.text,
        ...(!filled ? { backgroundColor: colors.primarySoft } : null),
      }
    : null;

  return (
    <TouchableOpacity
      style={[styles.cell, faded && styles.faded]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View
        style={[
          styles.circle,
          myStay && { backgroundColor: cal.myStay },
          occupiedTint && { backgroundColor: occupancyColor, borderWidth: 0 },
          blocked &&
            !occupiedTint && {
              backgroundColor: cal.bookedFill,
              borderWidth: 1,
              borderColor: cal.bookedBorder,
            },
          todayRing,
          selectedRing,
        ]}
      >
        <ThemedText
          style={[
            styles.dayText,
            { color: colors.text },
            filled && { color: colors.textOnBrand, fontWeight: '700' as const },
            blocked && !occupiedTint && { color: cal.booked, fontWeight: '600' as const },
            isToday && !filled && { fontWeight: '700' as const },
            selected && !filled && { fontWeight: '700' as const },
          ]}
        >
          {day}
        </ThemedText>
      </View>
      {dots && dots.length > 0 && (
        <View style={styles.dotsRow}>
          {dots.slice(0, 3).map((dot) => (
            <View key={dot.key} style={[styles.bar, { backgroundColor: dot.color }]} />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 6,
    minHeight: 52,
    justifyContent: 'flex-start',
  },
  faded: { opacity: 0.28 },
  circle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    width: 16,
    height: 5,
    borderRadius: 2.5,
  },
});
