import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useState, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MonthGrid, DayInfo } from '@/components/calendar/month-grid';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, EstateColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useStayStore } from '@/store/stay-store';
import { useEventStore } from '@/store/event-store';
import { SEED_USERS } from '@/store/seed-data';
import { getDaysInRange, formatDateRange, toISODate } from '@/lib/date-utils';
import { getEventOccurrences, describeRecurrence } from '@/lib/event-utils';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function OwnerCalendar() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const estates = useMemo(
    () => allEstates.filter((e) => e.ownerId === (currentUser?.id ?? '')),
    [allEstates, currentUser?.id]
  );
  const stays = useStayStore((s) => s.stays);
  const allEvents = useEventStore((s) => s.events);
  const estateIds = useMemo(() => estates.map((e) => e.id), [estates]);
  const estateEvents = useMemo(
    () => allEvents.filter((ev) => estateIds.includes(ev.estateId)),
    [allEvents, estateIds]
  );

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const estateColorMap: Record<string, string> = {};
  estates.forEach((e, i) => { estateColorMap[e.id] = EstateColors[i % EstateColors.length]; });

  const monthStart = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;
  const monthEnd = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${new Date(viewYear, viewMonth + 1, 0).getDate()}`;

  const dayInfoMap: Record<string, DayInfo> = {};
  stays.forEach((stay) => {
    const color = estateColorMap[stay.estateId];
    if (!color) return;
    getDaysInRange(stay.from, stay.to).forEach((dateStr) => {
      if (!dayInfoMap[dateStr]) dayInfoMap[dateStr] = { dateStr, dots: [] };
      dayInfoMap[dateStr].dots = [...(dayInfoMap[dateStr].dots ?? []), { color, key: stay.id }];
    });
  });

  estateEvents.forEach((ev) => {
    const occurrences = getEventOccurrences(ev, monthStart, monthEnd);
    const dotColor = ev.color ?? '#64748B';
    occurrences.forEach((dateStr) => {
      if (!dayInfoMap[dateStr]) dayInfoMap[dateStr] = { dateStr, dots: [] };
      dayInfoMap[dateStr].dots = [...(dayInfoMap[dateStr].dots ?? []), { color: dotColor, key: ev.id + dateStr }];
    });
  });

  const staysOnDay = selectedDay
    ? stays.filter((s) => selectedDay >= s.from && selectedDay <= s.to)
    : [];
  const eventsOnDay = selectedDay
    ? estateEvents.filter((ev) => getEventOccurrences(ev, selectedDay, selectedDay).length > 0)
    : [];

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <ThemedText type="title" style={styles.title}>Calendar</ThemedText>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
        {/* Month navigation */}
        <View style={styles.nav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <IconSymbol name="arrow.left" size={18} color={colors.tint} />
          </TouchableOpacity>
          <ThemedText type="defaultSemiBold" style={styles.monthLabel}>
            {MONTHS[viewMonth]} {viewYear}
          </ThemedText>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <IconSymbol name="arrow.right" size={18} color={colors.tint} />
          </TouchableOpacity>
        </View>

        <View style={[styles.calendarWrap, { backgroundColor: colors.background, borderColor: colors.icon + '22' }]}>
          <MonthGrid
            year={viewYear}
            month={viewMonth}
            dayInfoMap={dayInfoMap}
            onDayPress={(d) => setSelectedDay(d)}
          />
        </View>

        {(estates.length > 0 || estateEvents.length > 0) && (
          <View style={styles.legend}>
            {estates.map((e, i) => (
              <View key={e.id} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: EstateColors[i % EstateColors.length] }]} />
                <ThemedText style={[styles.legendText, { color: colors.icon }]} numberOfLines={1}>{e.name}</ThemedText>
              </View>
            ))}
            {estateEvents.map((ev) => (
              <View key={ev.id} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: ev.color ?? '#64748B' }]} />
                <ThemedText style={[styles.legendText, { color: colors.icon }]} numberOfLines={1}>{ev.title}</ThemedText>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {selectedDay && (
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.icon + '22' }]}>
          <View style={styles.sheetHeader}>
            <ThemedText type="defaultSemiBold" style={styles.sheetTitle}>{selectedDay}</ThemedText>
            <TouchableOpacity onPress={() => setSelectedDay(null)}>
              <IconSymbol name="xmark" size={18} color={colors.icon} />
            </TouchableOpacity>
          </View>
          {staysOnDay.length === 0 && eventsOnDay.length === 0 && (
            <ThemedText style={[styles.stayMeta, { color: colors.icon }]}>Nothing scheduled</ThemedText>
          )}
          {staysOnDay.map((stay) => {
            const estate = estates.find((e) => e.id === stay.estateId);
            const guest = SEED_USERS.find((u) => u.id === stay.guestId);
            const color = estateColorMap[stay.estateId];
            return (
              <View key={stay.id} style={[styles.stayRow, { borderLeftColor: color }]}>
                <ThemedText type="defaultSemiBold">{guest?.name ?? stay.guestId}</ThemedText>
                <ThemedText style={[styles.stayMeta, { color: colors.icon }]}>
                  {estate?.name} · {formatDateRange(stay.from, stay.to)}
                </ThemedText>
              </View>
            );
          })}
          {eventsOnDay.map((ev) => {
            const estate = estates.find((e) => e.id === ev.estateId);
            return (
              <View key={ev.id} style={[styles.stayRow, { borderLeftColor: ev.color ?? '#64748B' }]}>
                <ThemedText type="defaultSemiBold">{ev.title}</ThemedText>
                <ThemedText style={[styles.stayMeta, { color: colors.icon }]}>
                  {estate?.name} · {describeRecurrence(ev)}
                </ThemedText>
              </View>
            );
          })}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 32, fontWeight: '700' },
  scroll: { paddingHorizontal: 20 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { padding: 8 },
  monthLabel: { fontSize: 18 },
  calendarWrap: { padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 16 },
  stayRow: { paddingLeft: 10, borderLeftWidth: 3, gap: 2 },
  stayMeta: { fontSize: 13 },
});
