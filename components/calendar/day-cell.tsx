import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

export interface DotData {
  color: string;
  key: string;
}

export type DayAvailability = 'available' | 'blocked' | 'my-stay' | 'unavailable';

interface DayCellProps {
  day: number;
  isToday: boolean;
  isPast: boolean;
  dots?: DotData[];               // owner mode
  availability?: DayAvailability; // guest mode
  selected?: boolean;             // highlighted by user tap
  onPress?: () => void;
}

export function DayCell({ day, isToday, isPast, dots, availability, selected, onPress }: DayCellProps) {
  const blocked = availability === 'blocked';
  const myStay = availability === 'my-stay';
  const open = availability === 'available';
  const unavailable = availability === 'unavailable';

  return (
    <TouchableOpacity style={styles.cell} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
      <View
        style={[
          styles.circle,
          unavailable && styles.unavailableCircle,
          open && styles.availableCircle,
          myStay && styles.myStayCircle,
          blocked && styles.blockedCircle,
          isToday && styles.todayCircle,
          selected && styles.selectedCircle,
        ]}
      >
        <ThemedText
          style={[
            styles.dayText,
            isPast && !myStay && !blocked && !unavailable && styles.past,
            isToday && !myStay && !blocked && !unavailable && styles.todayText,
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
    paddingVertical: 3,
    borderWidth: 0.5,
    borderColor: '#e5e7eb', // light gray
  },
  circle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
     // light gray
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
  todayCircle: { borderWidth: 1.5, borderColor: '#0a7ea4' },
  selectedCircle: { borderWidth: 2.5, borderColor: '#6B4C3B' },
  dayText: { fontSize: 15 },
  past: { opacity: 0.3 },
  todayText: { fontWeight: '700', color: '#0a7ea4' },
  availableText: { color: '#15803d', fontWeight: '600' },
  unavailableText: { color: '#475569', fontWeight: '600' },
  myStayText: { color: '#fff', fontWeight: '700' },
  blockedText: { color: '#dc2626', fontWeight: '600' },
  dotsRow: { flexDirection: 'row', gap: 1, marginTop: 1, height: 1 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  bar: {
    width: 15,
    height: 5,
    borderRadius: 1,
  },


});
