import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

export interface DotData {
  color: string;
  key: string;
}

export type DayAvailability = 'available' | 'blocked' | 'my-stay';

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

  return (
    <TouchableOpacity style={styles.cell} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
      <View
        style={[
          styles.circle,
          myStay && styles.myStayCircle,
          blocked && styles.blockedCircle,
          isToday && styles.todayCircle,
          selected && styles.selectedCircle,
        ]}
      >
        <ThemedText
          style={[
            styles.dayText,
            isPast && !myStay && styles.past,
            isToday && !myStay && styles.todayText,
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
            <View key={dot.key} style={[styles.dot, { backgroundColor: dot.color }]} />
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
  },
  circle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myStayCircle: { backgroundColor: '#22c55e' },
  blockedCircle: { backgroundColor: '#ef444430' },
  todayCircle: { borderWidth: 1.5, borderColor: '#0a7ea4' },
  selectedCircle: { borderWidth: 2.5, borderColor: '#6B4C3B' },
  dayText: { fontSize: 13 },
  past: { opacity: 0.3 },
  todayText: { fontWeight: '700', color: '#0a7ea4' },
  myStayText: { color: '#fff', fontWeight: '700' },
  blockedText: { color: '#dc2626', fontWeight: '600' },
  dotsRow: { flexDirection: 'row', gap: 2, marginTop: 2, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
});
