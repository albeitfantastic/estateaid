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
  dots?: DotData[];            // owner mode
  availability?: DayAvailability; // guest mode
  onPress?: () => void;
}

export function DayCell({ day, isToday, isPast, dots, availability, onPress }: DayCellProps) {
  const blocked = availability === 'blocked';
  const myStay = availability === 'my-stay';

  return (
    <TouchableOpacity style={styles.cell} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
      <View
        style={[
          styles.circle,
          isToday && styles.todayCircle,
          myStay && { backgroundColor: '#22c55e22' },
          blocked && { backgroundColor: '#ef444418' },
        ]}
      >
        <ThemedText
          style={[
            styles.dayText,
            isPast && styles.past,
            isToday && styles.todayText,
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
    paddingVertical: 2,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: {
    borderWidth: 1.5,
    borderColor: '#0a7ea4',
  },
  dayText: { fontSize: 13 },
  past: { opacity: 0.3 },
  todayText: { fontWeight: '700', color: '#0a7ea4' },
  blockedText: { color: '#ef4444', opacity: 0.6 },
  dotsRow: { flexDirection: 'row', gap: 2, marginTop: 2, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
});
