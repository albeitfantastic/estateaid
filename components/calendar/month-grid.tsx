import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DayCell, DotData, DayAvailability } from './day-cell';
import { toISODate } from '@/lib/date-utils';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export interface DayInfo {
  dateStr: string;
  dots?: DotData[];
  availability?: DayAvailability;
}

interface MonthGridProps {
  year: number;
  month: number; // 0-based
  dayInfoMap: Record<string, DayInfo>;
  onDayPress?: (dateStr: string) => void;
}

export function MonthGrid({ year, month, dayInfoMap, onDayPress }: MonthGridProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const todayStr = toISODate(new Date());
  const today = new Date();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <View>
      <View style={styles.weekRow}>
        {DAYS.map((d) => (
          <ThemedText key={d} style={[styles.dayHeader, { color: colors.icon }]}>{d}</ThemedText>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) return <View key={i} style={styles.empty} />;
          const m = String(month + 1).padStart(2, '0');
          const d = String(day).padStart(2, '0');
          const dateStr = `${year}-${m}-${d}`;
          const info = dayInfoMap[dateStr];
          const isPast = dateStr < todayStr;
          const isToday = dateStr === todayStr;

          return (
            <DayCell
              key={dateStr}
              day={day}
              isToday={isToday}
              isPast={isPast}
              dots={info?.dots}
              availability={info?.availability}
              onPress={onDayPress ? () => onDayPress(dateStr) : undefined}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  empty: { width: `${100 / 7}%` },
});
