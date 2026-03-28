import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayInfo, MonthGrid } from '@/components/calendar/month-grid';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionHeader } from '@/components/ui/section-header';
import { Colors, EstateColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDateRange, getDaysInRange, today } from '@/lib/date-utils';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { SEED_USERS } from '@/store/seed-data';
import { useStayStore } from '@/store/stay-store';
import { useTicketStore } from '@/store/ticket-store';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function OwnerDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const allStayRequests = useStayStore((s) => s.stayRequests);
  const allStays = useStayStore((s) => s.stays);
  const allTickets = useTicketStore((s) => s.tickets);
  const allInvitations = useInvitationStore((s) => s.invitations);
  const todayStr = today();

  const estates = useMemo(
    () => allEstates.filter((e) => e.ownerId === currentUser?.id),
    [allEstates, currentUser?.id]
  );
  const estateIds = useMemo(() => estates.map((e) => e.id), [estates]);

  const pendingCount = useMemo(
    () => allStayRequests.filter((r) => estateIds.includes(r.estateId) && r.status === 'pending').length,
    [allStayRequests, estateIds]
  );
  const openTicketsCount = useMemo(
    () => allTickets.filter((t) => estateIds.includes(t.estateId) && t.status !== 'resolved' && t.status !== 'closed').length,
    [allTickets, estateIds]
  );
  const activeStays = useMemo(
    () => allStays.filter((st) => estateIds.includes(st.estateId) && st.from <= todayStr && st.to >= todayStr),
    [allStays, estateIds, todayStr]
  );

  const guestsCount = useMemo(() => {
    const ids = new Set(
      allInvitations
        .filter((inv) => estateIds.includes(inv.estateId) && inv.status === 'accepted' && inv.guestId)
        .map((inv) => inv.guestId!)
    );
    return ids.size;
  }, [allInvitations, estateIds]);

  const upcomingStays = useMemo(
    () =>
      allStays
        .filter((s) => estateIds.includes(s.estateId) && s.to >= todayStr)
        .sort((a, b) => a.from.localeCompare(b.from))
        .slice(0, 5),
    [allStays, estateIds, todayStr]
  );

  const estateColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    estates.forEach((e, i) => { map[e.id] = EstateColors[i % EstateColors.length]; });
    return map;
  }, [estates]);

  // Interactive calendar state
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
    setSelectedDay(null);
  }

  const dayInfoMap = useMemo(() => {
    const map: Record<string, DayInfo> = {};
    allStays.forEach((stay) => {
      const color = estateColorMap[stay.estateId];
      if (!color) return;
      getDaysInRange(stay.from, stay.to).forEach((dateStr) => {
        if (!map[dateStr]) map[dateStr] = { dateStr, dots: [] };
        map[dateStr].dots = [...(map[dateStr].dots ?? []), { color, key: stay.id }];
      });
    });
    return map;
  }, [allStays, estateColorMap]);

  const staysOnSelectedDay = selectedDay
    ? allStays.filter((s) => selectedDay >= s.from && selectedDay <= s.to && estateIds.includes(s.estateId))
    : [];

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View>
          <ThemedText type="title" style={styles.greeting}>
            Good day, {currentUser?.name.split(' ')[0]}
          </ThemedText>
          <ThemedText style={[styles.sub, { color: colors.icon }]}>Your estate dashboard</ThemedText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard
            icon="building.2.fill"
            value={estates.length}
            label="Estates"
            color={colors.tint}
            colors={colors}
            onPress={() => router.push('/(owner)/estates' as never)}
          />
          <StatCard
            icon="person.2.fill"
            value={guestsCount}
            label="Guests"
            color="#22c55e"
            colors={colors}
            onPress={() => router.push('/(owner)/guests' as never)}
          />
          <StatCard
            icon="tray.fill"
            value={pendingCount}
            label="Pending"
            color="#f59e0b"
            colors={colors}
            onPress={() => router.push('/(owner)/requests' as never)}
          />
          <StatCard
            icon="exclamationmark.triangle.fill"
            value={openTicketsCount}
            label="Tickets"
            color="#ef4444"
            colors={colors}
            onPress={() => router.push('/(owner)/tickets' as never)}
          />
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '30' }]}
            onPress={() => router.push('/(owner)/plan-stay' as never)}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.tint + '20' }]}>
              <IconSymbol name="calendar.badge.plus" size={22} color={colors.tint} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.actionTitle}>Plan a Stay</ThemedText>
            <ThemedText style={[styles.actionSub, { color: colors.icon }]}>Schedule guests</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '30' }]}
            onPress={() => router.push('/(owner)/invite' as never)}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.tint + '20' }]}>
              <IconSymbol name="envelope.fill" size={22} color={colors.tint} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.actionTitle}>Invite User</ThemedText>
            <ThemedText style={[styles.actionSub, { color: colors.icon }]}>Send access codes</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Upcoming Stays */}
        <SectionHeader
          title="Upcoming Stays"
          actionLabel="See All"
          onAction={() => router.push('/(owner)/stays' as never)}
        />
        {upcomingStays.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="No upcoming stays"
            subtitle="Plan a stay or wait for guest requests."
          />
        ) : (
          <View style={styles.upcomingList}>
            {upcomingStays.map((stay) => {
              const estate = estates.find((e) => e.id === stay.estateId);
              const guest = SEED_USERS.find((u) => u.id === stay.guestId);
              const dotColor = estateColorMap[stay.estateId] ?? colors.tint;
              return (
                <View
                  key={stay.id}
                  style={[styles.stayRow, { backgroundColor: colors.background, borderColor: colors.icon + '22' }]}
                >
                  <View style={[styles.colorBar, { backgroundColor: dotColor }]} />
                  <View style={styles.stayInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.stayGuest}>
                      {guest?.name ?? stay.guestId}
                    </ThemedText>
                    <ThemedText style={[styles.stayMeta, { color: colors.icon }]}>
                      {estate?.name} · {formatDateRange(stay.from, stay.to)}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Interactive Calendar */}
        <SectionHeader title="This Month" />
        <View style={styles.calendarNav}>
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
            onDayPress={(d) => setSelectedDay(selectedDay === d ? null : d)}
          />
        </View>

        {estates.length > 0 && (
          <View style={styles.legend}>
            {estates.map((e, i) => (
              <View key={e.id} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: EstateColors[i % EstateColors.length] }]} />
                <ThemedText style={[styles.legendText, { color: colors.icon }]} numberOfLines={1}>{e.name}</ThemedText>
              </View>
            ))}
          </View>
        )}

        {selectedDay && staysOnSelectedDay.length > 0 && (
          <View style={[styles.dayDetail, { backgroundColor: colors.background, borderColor: colors.icon + '22' }]}>
            <ThemedText type="defaultSemiBold" style={styles.dayDetailTitle}>{selectedDay}</ThemedText>
            {staysOnSelectedDay.map((stay) => {
              const estate = estates.find((e) => e.id === stay.estateId);
              const guest = SEED_USERS.find((u) => u.id === stay.guestId);
              const dotColor = estateColorMap[stay.estateId] ?? colors.tint;
              return (
                <View key={stay.id} style={[styles.dayStayRow, { borderLeftColor: dotColor }]}>
                  <ThemedText type="defaultSemiBold">{guest?.name ?? stay.guestId}</ThemedText>
                  <ThemedText style={[styles.stayMeta, { color: colors.icon }]}>
                    {estate?.name} · {formatDateRange(stay.from, stay.to)}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

interface StatCardProps {
  icon: string;
  value: number;
  label: string;
  color: string;
  colors: typeof Colors.light;
  onPress?: () => void;
}

function StatCard({ icon, value, label, color, colors, onPress }: StatCardProps) {
  return (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: color + '12', borderColor: color + '33' }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.75 : 1}
    >
      <IconSymbol name={icon as never} size={22} color={color} />
      <ThemedText style={[styles.statValue, { color }]}>{value}</ThemedText>
      <ThemedText style={[styles.statLabel, { color: colors.icon }]}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  greeting: { fontSize: 28, fontWeight: '700' },
  sub: { fontSize: 14, marginTop: 2 },
  scroll: { paddingHorizontal: 20 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 10, textAlign: 'center' },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  actionTitle: { fontSize: 14 },
  actionSub: { fontSize: 12 },

  // Upcoming stays
  upcomingList: { gap: 8, marginBottom: 4 },
  stayRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  colorBar: { width: 4, alignSelf: 'stretch' },
  stayInfo: { flex: 1, padding: 12, gap: 2 },
  stayGuest: { fontSize: 14 },
  stayMeta: { fontSize: 12 },

  // Calendar
  calendarNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  navBtn: { padding: 8 },
  monthLabel: { fontSize: 16 },
  calendarWrap: { padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
  dayDetail: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10, marginBottom: 4 },
  dayDetailTitle: { fontSize: 14, marginBottom: 2 },
  dayStayRow: { paddingLeft: 10, borderLeftWidth: 3, gap: 2 },
});
