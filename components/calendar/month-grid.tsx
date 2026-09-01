import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/theme/useAppTheme';
import { DayCell, DotData, DayAvailability } from './day-cell';
import { toISODate } from '@/lib/date-utils';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export interface DayInfo {
  dateStr: string;
  dots?: DotData[];
  availability?: DayAvailability;
  /** Host occupancy fill — guest calendar color when someone else is staying. */
  occupancyColor?: string;
}

interface MonthGridProps {
  year: number;
  month: number; // 0-based
  dayInfoMap: Record<string, DayInfo>;
  onDayPress?: (dateStr: string) => void;
  selectedDay?: string;
}

export function MonthGrid({ year, month, dayInfoMap, onDayPress, selectedDay }: MonthGridProps) {
  const t = useAppTheme();
  const colors = t.colors;
  const todayStr = toISODate(new Date());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const colLine = {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.borderSoft,
  };
  const rowLine = {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
  };

  return (
    <View>
      <View style={[styles.weekHeader, rowLine]}>
        {DAYS.map((d, i) => (
          <View key={d} style={[styles.headerCell, i < 6 && colLine]}>
            <ThemedText style={[styles.dayHeader, { color: colors.textMuted }]}>
              {d}
            </ThemedText>
          </View>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => {
            const frameStyle = [
              styles.cellFrame,
              di < 6 && colLine,
              wi < weeks.length - 1 && rowLine,
            ];
            if (day === null) {
              return <View key={`e-${wi}-${di}`} style={frameStyle} />;
            }
            const m = String(month + 1).padStart(2, '0');
            const d = String(day).padStart(2, '0');
            const dateStr = `${year}-${m}-${d}`;
            const info = dayInfoMap[dateStr];
            const isToday = dateStr === todayStr;

            return (
              <View key={dateStr} style={frameStyle}>
                <DayCell
                  day={day}
                  isToday={isToday}
                  dots={info?.dots}
                  availability={info?.availability}
                  occupancyColor={info?.occupancyColor}
                  selected={selectedDay === dateStr}
                  onPress={onDayPress ? () => onDayPress(dateStr) : undefined}
                />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  weekHeader: {
    flexDirection: 'row',
  },
  headerCell: {
    flex: 1,
    paddingBottom: 10,
    paddingTop: 2,
  },
  dayHeader: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.4,
  },
  weekRow: {
    flexDirection: 'row',
  },
  cellFrame: {
    flex: 1,
    minHeight: 52,
  },
});
