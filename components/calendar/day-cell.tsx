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
  isPast: boolean;
  dots?: DotData[];
  availability?: DayAvailability;
  selected?: boolean;
  onPress?: () => void;
}

export function DayCell({ day, isToday, isPast, dots, availability, selected, onPress }: DayCellProps) {
  const t = useAppTheme();
  const colors = t.colors;
  const cal = CalendarColors[t.scheme === 'dark' ? 'dark' : 'light'];

  const blocked = availability === 'blocked';
  const myStay = availability === 'my-stay';
  const open = availability === 'available';
  const unavailable = availability === 'unavailable';
  const ownerMode = availability === undefined;

  const todayRing =
    ownerMode && isToday && !selected && !myStay && !blocked && !unavailable
      ? {
          borderWidth: 2,
          borderColor: colors.primary,
          backgroundColor: colors.primarySoft,
        }
      : null;

  /** Guest + owner: show tap selection except on blocked / owner-stay cells */
  const selectedRing =
    selected && !myStay && !blocked
      ? {
          borderWidth: 2,
          borderColor: colors.primary,
          backgroundColor: colors.primarySoft,
        }
      : null;

  return (
    <TouchableOpacity style={styles.cell} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
      <View
        style={[
          styles.circle,
          open && {
            backgroundColor: cal.availableFill,
            borderWidth: 1,
            borderColor: cal.availableBorder,
          },
          unavailable && {
            backgroundColor: colors.textSecondary + '18',
            borderWidth: 1,
            borderColor: colors.textSecondary + '55',
          },
          myStay && { backgroundColor: cal.myStay },
          blocked && {
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
            ownerMode && isPast && !selected && styles.past,
            ownerMode && isToday && !selected && { color: colors.primary, fontWeight: '700' as const },
            ownerMode && selected && { color: colors.primary, fontWeight: '700' as const },
            !ownerMode && selected && !myStay && !blocked && { color: colors.primary, fontWeight: '700' as const },
            open && !isToday && { color: cal.available, fontWeight: '600' as const },
            unavailable && { color: colors.textSecondary, fontWeight: '600' as const },
            myStay && { color: colors.textOnBrand, fontWeight: '700' as const },
            blocked && { color: cal.booked, fontWeight: '600' as const },
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
  past: { opacity: 0.4 },
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
