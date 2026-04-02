import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const blocked = availability === 'blocked';
  const myStay = availability === 'my-stay';
  const open = availability === 'available';
  const unavailable = availability === 'unavailable';
  const ownerMode = availability === undefined;

  const todayRing =
    ownerMode && isToday && !selected && !myStay && !blocked && !unavailable
      ? {
          borderWidth: 2,
          borderColor: colors.tint,
          backgroundColor: colors.tint + '14',
        }
      : null;

  /** Guest + owner: show tap selection except on blocked / owner-stay cells */
  const selectedRing =
    selected && !myStay && !blocked
      ? {
          borderWidth: 2,
          borderColor: colors.tint,
          backgroundColor: colors.tint + (ownerMode ? '26' : '1c'),
        }
      : null;

  return (
    <TouchableOpacity style={styles.cell} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
      <View
        style={[
          styles.circle,
          unavailable && styles.unavailableCircle,
          open && styles.availableCircle,
          myStay && styles.myStayCircle,
          blocked && styles.blockedCircle,
          todayRing,
          selectedRing,
        ]}
      >
        <ThemedText
          style={[
            styles.dayText,
            ownerMode && isPast && !selected && styles.past,
            ownerMode && isToday && !selected && { color: colors.tint, fontWeight: '700' as const },
            ownerMode && selected && { color: colors.tint, fontWeight: '700' as const },
            !ownerMode && selected && !myStay && !blocked && { color: colors.tint, fontWeight: '700' as const },
            open && !isToday && styles.availableText,
            unavailable && styles.unavailableText,
            myStay && styles.myStayText,
            blocked && styles.blockedText,
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
  availableCircle: {
    backgroundColor: '#16a34a14',
    borderWidth: 1,
    borderColor: '#16a34a44',
  },
  unavailableCircle: {
    backgroundColor: '#64748b18',
    borderWidth: 1,
    borderColor: '#64748b55',
  },
  myStayCircle: { backgroundColor: '#22c55e' },
  blockedCircle: {
    backgroundColor: '#ef444438',
    borderWidth: 1,
    borderColor: '#dc262688',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.headingSemiBold,
  },
  past: { opacity: 0.4 },
  availableText: { color: '#15803d', fontWeight: '600' },
  unavailableText: { color: '#475569', fontWeight: '600' },
  myStayText: { color: '#fff', fontWeight: '700' },
  blockedText: { color: '#dc2626', fontWeight: '600' },
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
