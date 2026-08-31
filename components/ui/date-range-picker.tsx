import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from './icon-symbol';
import { useAppTheme } from '@/theme/useAppTheme';
import { getDaysInRange, parseDateStr, toISODate } from '@/lib/date-utils';

interface DateRangePickerProps {
  from: string | null;
  to: string | null;
  blockedRanges?: { from: string; to: string }[];
  onChange: (from: string | null, to: string | null) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function isBlocked(dateStr: string, blockedRanges: { from: string; to: string }[]): boolean {
  return blockedRanges.some((r) => dateStr >= r.from && dateStr <= r.to);
}

export function DateRangePicker({ from, to, blockedRanges = [], onChange }: DateRangePickerProps) {
  const t = useAppTheme();
  const colors = t.colors;
  const today = toISODate(new Date());

  const [viewYear, setViewYear] = useState(() => {
    const base = from ? parseDateStr(from) : new Date();
    return base.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const base = from ? parseDateStr(from) : new Date();
    return base.getMonth();
  });
  const [selecting, setSelecting] = useState<'from' | 'to'>(from ? 'to' : 'from');

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function handleDayPress(dateStr: string) {
    if (dateStr < today) return;
    if (isBlocked(dateStr, blockedRanges)) return;

    if (selecting === 'from') {
      onChange(dateStr, null);
      setSelecting('to');
    } else {
      if (from && dateStr < from) {
        onChange(dateStr, null);
        setSelecting('to');
      } else {
        onChange(from, dateStr);
        setSelecting('from');
      }
    }
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const y = String(viewYear);
    const m = String(viewMonth + 1).padStart(2, '0');
    const day = String(d).padStart(2, '0');
    cells.push(`${y}-${m}-${day}`);
  }

  const inRange = from && to ? getDaysInRange(from, to) : [];

  return (
    <View style={styles.container}>
      {/* Month navigation */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <IconSymbol name="arrow.left" size={18} color={colors.primary} />
        </TouchableOpacity>
        <ThemedText type="defaultSemiBold" style={styles.monthLabel}>
          {MONTHS[viewMonth]} {viewYear}
        </ThemedText>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <IconSymbol name="arrow.right" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={styles.weekRow}>
        {DAYS.map((d) => (
          <ThemedText key={d} style={[styles.dayHeader, { color: colors.textMuted }]}>{d}</ThemedText>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {cells.map((dateStr, i) => {
          if (!dateStr) return <View key={i} style={styles.cell} />;

          const isPast = dateStr < today;
          const blocked = isBlocked(dateStr, blockedRanges);
          const isFrom = dateStr === from;
          const isTo = dateStr === to;
          const isMid = inRange.includes(dateStr) && !isFrom && !isTo;
          const isEndpoint = isFrom || isTo;

          return (
            <TouchableOpacity
              key={dateStr}
              style={[
                styles.cell,
                isMid && { backgroundColor: colors.primarySoft },
                isEndpoint && { backgroundColor: colors.primary },
              ]}
              onPress={() => handleDayPress(dateStr)}
              disabled={isPast || blocked}
              activeOpacity={0.7}
            >
              <ThemedText
                style={[
                  styles.dayText,
                  (isPast || blocked) && styles.dimmed,
                  blocked && styles.blocked,
                  isEndpoint && { color: colors.textOnBrand, fontWeight: '700' },
                ]}
              >
                {parseInt(dateStr.slice(8))}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selection hint */}
      <ThemedText style={[styles.hint, { color: colors.textMuted }]}>
        {selecting === 'from' ? 'Select check-in date' : 'Select check-out date'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  navBtn: { padding: 8 },
  monthLabel: { fontSize: 16 },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  dayText: { fontSize: 14 },
  dimmed: { opacity: 0.25 },
  blocked: { textDecorationLine: 'line-through', opacity: 0.3 },
  hint: { textAlign: 'center', fontSize: 13, marginTop: 8 },
});
