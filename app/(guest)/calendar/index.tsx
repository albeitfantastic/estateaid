import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MonthGrid, DayInfo } from '@/components/calendar/month-grid';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useStayStore } from '@/store/stay-store';
import { getDaysInRange, toISODate } from '@/lib/date-utils';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function GuestCalendar() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);

  const allInvitations = useInvitationStore((s) => s.invitations);
  const allEstates = useEstateStore((s) => s.estates);

  const acceptedEstates = useMemo(() => {
    const estateIds = allInvitations
      .filter((inv) => inv.guestEmail === currentUser?.email && inv.status === 'accepted')
      .map((inv) => inv.estateId);
    return allEstates.filter((e) => estateIds.includes(e.id));
  }, [allInvitations, allEstates, currentUser?.email]);

  const acceptedEstateIds = useMemo(() => acceptedEstates.map((e) => e.id), [acceptedEstates]);

  const [selectedEstateId, setSelectedEstateId] = useState<string>(acceptedEstateIds[0] ?? '');
  const allStays = useStayStore((s) => s.stays);

  const today = new Date();
  const todayStr = toISODate(today);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const blockedRanges = useMemo(
    () => selectedEstateId ? allStays.filter((s) => s.estateId === selectedEstateId).map(({ from, to }) => ({ from, to })) : [],
    [allStays, selectedEstateId]
  );
  const myStays = useMemo(
    () => allStays.filter((s) => s.estateId === selectedEstateId && s.guestId === currentUser?.id),
    [allStays, selectedEstateId, currentUser?.id]
  );

  // Build dayInfoMap — no guest names, just availability
  const dayInfoMap: Record<string, DayInfo> = {};
  blockedRanges.forEach(({ from, to }) => {
    getDaysInRange(from, to).forEach((dateStr) => {
      dayInfoMap[dateStr] = { dateStr, availability: 'blocked' };
    });
  });
  myStays.forEach(({ from, to }) => {
    getDaysInRange(from, to).forEach((dateStr) => {
      dayInfoMap[dateStr] = { dateStr, availability: 'my-stay' };
    });
  });

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
        <ThemedText type="title" style={styles.title}>Availability</ThemedText>
      </View>

      {acceptedEstates.length === 0 ? (
        <View style={styles.center}>
          <ThemedText style={{ opacity: 0.5 }}>No estates to show. Accept an invitation first.</ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
          {/* Estate picker */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.estateRow}>
            {acceptedEstates.map((estate) => (
              <TouchableOpacity
                key={estate.id}
                style={[
                  styles.estatePill,
                  { borderColor: colors.tint + '44' },
                  selectedEstateId === estate.id && { backgroundColor: colors.tint, borderColor: colors.tint },
                ]}
                onPress={() => setSelectedEstateId(estate.id)}
                activeOpacity={0.8}
              >
                <ThemedText
                  style={[
                    styles.estatePillText,
                    { color: selectedEstateId === estate.id ? '#fff' : colors.text },
                  ]}
                >
                  {estate.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>

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
            <MonthGrid year={viewYear} month={viewMonth} dayInfoMap={dayInfoMap} />
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#22c55e22', borderColor: '#22c55e55' }]} />
              <ThemedText style={[styles.legendText, { color: colors.icon }]}>My approved stay</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#ef444418', borderColor: '#ef444455' }]} />
              <ThemedText style={[styles.legendText, { color: colors.icon }]}>Not available</ThemedText>
            </View>
          </View>
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 32, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  scroll: { paddingHorizontal: 20 },
  estateRow: { gap: 8, paddingVertical: 4, marginBottom: 16 },
  estatePill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  estatePillText: { fontSize: 13, fontWeight: '600' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { padding: 8 },
  monthLabel: { fontSize: 18 },
  calendarWrap: { padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  legend: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendBox: { width: 14, height: 14, borderRadius: 4, borderWidth: 1 },
  legendText: { fontSize: 12 },
});
