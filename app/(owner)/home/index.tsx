import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayInfo, MonthGrid } from '@/components/calendar/month-grid';
import { SettingsSheet, type SettingsDestination } from '@/components/settings/settings-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionHeader } from '@/components/ui/section-header';
import { Colors, EstateColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDateRange, getDaysInRange, today } from '@/lib/date-utils';
import { navigateToSettingsSection } from '@/lib/settings-navigation';
import { getEventOccurrences, describeRecurrence } from '@/lib/event-utils';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useEventStore } from '@/store/event-store';
import { useInvitationStore } from '@/store/invitation-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { useStayStore } from '@/store/stay-store';
import { useTicketStore } from '@/store/ticket-store';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getStayRelativeLabel(from: string, to: string, todayStr: string): string {
  if (from === todayStr) return 'Arriving today';
  if (to === todayStr) return 'Departing today';
  if (from <= todayStr && to >= todayStr) return 'Active stay';
  const diffMs = new Date(from).getTime() - new Date(todayStr).getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return 'Tomorrow';
  return `In ${diffDays} days`;
}

export default function OwnerDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const {
    themePreference,
    setThemePreference,
    signOut,
    selectedTier,
    notificationsEnabled,
    setNotificationsEnabled,
  } = useAuthStore();
  const isDark = themePreference === 'dark';
  const [menuOpen, setMenuOpen] = useState(false);
  const allEstates = useEstateStore((s) => s.estates);
  const allStayRequests = useStayStore((s) => s.stayRequests);
  const allStays = useStayStore((s) => s.stays);
  const allTickets = useTicketStore((s) => s.tickets);
  const allInvitations = useInvitationStore((s) => s.invitations);
  const allEvents = useEventStore((s) => s.events);
  const todayStr = today();
  const profileById = useProfileStore((s) => s.byId);

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

  const todayArrivals = useMemo(
    () => allStays.filter((s) => estateIds.includes(s.estateId) && s.from === todayStr),
    [allStays, estateIds, todayStr]
  );
  const todayDepartures = useMemo(
    () => allStays.filter((s) => estateIds.includes(s.estateId) && s.to === todayStr),
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
  const [legendOpen, setLegendOpen] = useState(false);

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

  const estateEvents = useMemo(
    () => allEvents.filter((ev) => estateIds.includes(ev.estateId)),
    [allEvents, estateIds]
  );

  const monthStart = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;
  const monthEnd = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${new Date(viewYear, viewMonth + 1, 0).getDate()}`;

  const dayInfoMap = useMemo(() => {
    const map: Record<string, DayInfo> = {};
    allStays.forEach((stay) => {
      if (!stay.from || !stay.to) return;
      const color = estateColorMap[stay.estateId] ?? colors.tint;
      getDaysInRange(stay.from, stay.to).forEach((dateStr) => {
        if (!map[dateStr]) map[dateStr] = { dateStr, dots: [] };
        map[dateStr].dots = [...(map[dateStr].dots ?? []), { color, key: stay.id }];
      });
    });
    estateEvents.forEach((ev) => {
      const dotColor = ev.color ?? '#64748B';
      getEventOccurrences(ev, monthStart, monthEnd).forEach((dateStr) => {
        if (!map[dateStr]) map[dateStr] = { dateStr, dots: [] };
        map[dateStr].dots = [...(map[dateStr].dots ?? []), { color: dotColor, key: ev.id + dateStr }];
      });
    });
    return map;
  }, [allStays, estateColorMap, estateEvents, monthStart, monthEnd, colors.tint]);

  const staysOnSelectedDay = selectedDay
    ? allStays.filter((s) => selectedDay >= s.from && selectedDay <= s.to && estateIds.includes(s.estateId))
    : [];
  const eventsOnSelectedDay = selectedDay
    ? estateEvents.filter((ev) => getEventOccurrences(ev, selectedDay, selectedDay).length > 0)
    : [];

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={{ flex: 1 }}>
          <ThemedText type="title" style={styles.greeting}>
            Good day, {currentUser?.name.split(' ')[0]}
          </ThemedText>
          <ThemedText style={[styles.sub, { color: colors.icon }]}>Your estate dashboard</ThemedText>
        </View>
        <TouchableOpacity
          onPress={() => setMenuOpen(true)}
          style={[styles.menuBtn, { backgroundColor: colors.tint + '12' }]}
          activeOpacity={0.7}
        >
          <IconSymbol name="line.3.horizontal" size={20} color={colors.tint} />
        </TouchableOpacity>
      </View>

      <SettingsSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        colors={colors}
        insets={insets}
        currentUser={currentUser ? { name: currentUser.name, email: currentUser.email } : null}
        userRole={currentUser?.role ?? 'guest'}
        selectedTier={selectedTier}
        isDark={isDark}
        notificationsOn={notificationsEnabled}
        onToggleDark={(v: boolean) => setThemePreference(v ? 'dark' : 'light')}
        onToggleNotifications={setNotificationsEnabled}
        onNavigate={(dest: SettingsDestination) => navigateToSettingsSection(router, 'owner', dest)}
        onSignOut={() => {
          void signOut().then(() => router.replace('/(auth)' as never));
        }}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard
            icon="building.2.fill"
            value={estates.length}
            label="Properties"
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
            label="Approvals"
            color="#f59e0b"
            colors={colors}
            onPress={() => router.push('/(owner)/requests' as never)}
          />
          {/*}
          <StatCard
            icon="exclamationmark.triangle.fill"
            value={openTicketsCount}
            label="Tickets"
            color="#ef4444"
            colors={colors}
            onPress={() => router.push('/(owner)/tickets' as never)}
          />*/}
        </View>
    
        {/* Today's Priorities */}
        {(todayArrivals.length > 0 || todayDepartures.length > 0 || pendingCount > 0) && (
          <View style={styles.priorityRow}>
            {todayArrivals.length > 0 && (
              <TouchableOpacity
                style={[styles.priorityChip, { backgroundColor: '#22c55e18', borderColor: '#22c55e33' }]}
                onPress={() => router.push('/(owner)/stays' as never)}
                activeOpacity={0.75}
              >
                <IconSymbol name="arrow.down.circle.fill" size={14} color="#22c55e" />
                <ThemedText style={[styles.priorityText, { color: '#22c55e' }]}>
                  {todayArrivals.length} arriving
                </ThemedText>
              </TouchableOpacity>
            )}
            {todayDepartures.length > 0 && (
              <TouchableOpacity
                style={[styles.priorityChip, { backgroundColor: '#f59e0b18', borderColor: '#f59e0b33' }]}
                onPress={() => router.push('/(owner)/stays' as never)}
                activeOpacity={0.75}
              >
                <IconSymbol name="arrow.up.circle.fill" size={14} color="#f59e0b" />
                <ThemedText style={[styles.priorityText, { color: '#f59e0b' }]}>
                  {todayDepartures.length} departing
                </ThemedText>
              </TouchableOpacity>
            )}
            {pendingCount > 0 && (
              <TouchableOpacity
                style={[styles.priorityChip, { backgroundColor: colors.tint + '18', borderColor: colors.tint + '33' }]}
                onPress={() => router.push('/(owner)/requests' as never)}
                activeOpacity={0.75}
              >
                <IconSymbol name="tray.fill" size={14} color={colors.tint} />
                <ThemedText style={[styles.priorityText, { color: colors.tint }]}>
                  {pendingCount} pending
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}

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
              const isOwnerStay = stay.guestId === currentUser?.id;
              const guestLabel = isOwnerStay
                ? `${currentUser?.name?.split(' ')[0] ?? 'You'} (you)`
                : resolveUserDisplayName(stay.guestId, profileById);
              const dotColor = estateColorMap[stay.estateId] ?? colors.tint;
              const relLabel = getStayRelativeLabel(stay.from, stay.to, todayStr);
              const isActive = stay.from <= todayStr && stay.to >= todayStr;
              const relColor = isActive ? '#22c55e' : colors.tint;
              return (
                <TouchableOpacity
                  key={stay.id}
                  style={[styles.stayRow, { backgroundColor: colors.background, borderColor: colors.icon + '22' }]}
                  onPress={() => router.push('/(owner)/stays' as never)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.colorBar, { backgroundColor: dotColor }]} />
                  <View style={styles.stayInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.stayGuest}>
                      {guestLabel}
                    </ThemedText>
                    <ThemedText style={[styles.stayMeta, { color: colors.icon }]}>
                      {estate?.name} · {formatDateRange(stay.from, stay.to)}
                    </ThemedText>
                  </View>
                  <View style={[styles.relBadge, { backgroundColor: relColor + '15' }]}>
                    <ThemedText style={[styles.relBadgeText, { color: relColor }]}>{relLabel}</ThemedText>
                  </View>
                </TouchableOpacity>
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

        {(estates.length > 0 || estateEvents.length > 0) && (
          <>
            <TouchableOpacity
              style={styles.legendToggle}
              onPress={() => setLegendOpen((o) => !o)}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.legendToggleText, { color: colors.icon }]}>Legend</ThemedText>
              <IconSymbol name={legendOpen ? 'chevron.up' : 'chevron.down'} size={12} color={colors.icon} />
            </TouchableOpacity>
            {legendOpen && (
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
          </>
        )}

        {selectedDay && (
          <View style={[styles.dayDetail, { backgroundColor: colors.surface, borderColor: colors.icon + '22' }]}>
            <View style={styles.dayDetailHeader}>
              <ThemedText type="defaultSemiBold" style={styles.dayDetailTitle}>{selectedDay}</ThemedText>
              <TouchableOpacity onPress={() => setSelectedDay(null)}>
                <IconSymbol name="xmark" size={14} color={colors.icon} />
              </TouchableOpacity>
            </View>
            {staysOnSelectedDay.length === 0 && eventsOnSelectedDay.length === 0 && (
              <ThemedText style={[styles.stayMeta, { color: colors.icon }]}>Nothing scheduled</ThemedText>
            )}
            {staysOnSelectedDay.map((stay) => {
              const estate = estates.find((e) => e.id === stay.estateId);
              const dotColor = estateColorMap[stay.estateId] ?? colors.tint;
              const guestLabel =
                stay.guestId === currentUser?.id
                  ? (currentUser?.name ?? 'You')
                  : resolveUserDisplayName(stay.guestId, profileById);
              return (
                <View key={stay.id} style={[styles.dayStayRow, { borderLeftColor: dotColor }]}>
                  <ThemedText type="defaultSemiBold">{guestLabel}</ThemedText>
                  <ThemedText style={[styles.stayMeta, { color: colors.icon }]}>
                    {estate?.name} · {formatDateRange(stay.from, stay.to)}
                  </ThemedText>
                </View>
              );
            })}
            {eventsOnSelectedDay.map((ev) => {
              const estate = estates.find((e) => e.id === ev.estateId);
              return (
                <View key={ev.id} style={[styles.dayStayRow, { borderLeftColor: ev.color ?? '#64748B' }]}>
                  <ThemedText type="defaultSemiBold">{ev.title}</ThemedText>
                  <ThemedText style={[styles.stayMeta, { color: colors.icon }]}>
                    {estate?.name} · {describeRecurrence(ev)}
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  menuBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  greeting: { fontSize: 28, fontWeight: '700' },
  sub: { fontSize: 14, marginTop: 2 },
  scroll: { paddingHorizontal: 20 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, padding: 12, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 4,
    shadowColor: '#2A1F18', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: '700', fontFamily: 'serif' },
  statLabel: { fontSize: 10, textAlign: 'center', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  actionCard: {
    flex: 1, borderRadius: 18, borderWidth: 1, padding: 16, gap: 6,
    shadowColor: '#2A1F18', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  actionTitle: { fontSize: 14, fontFamily: 'sans-serif', fontWeight: '600' },
  actionSub: { fontSize: 12, fontFamily: 'sans-serif' },

  // Today's priorities
  priorityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  priorityChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  priorityText: { fontSize: 12, fontWeight: '600' },

  // Upcoming stays
  upcomingList: { gap: 8, marginBottom: 4 },
  stayRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#2A1F18', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  colorBar: { width: 4, alignSelf: 'stretch' },
  stayInfo: { flex: 1, padding: 12, gap: 2 },
  stayGuest: { fontSize: 14 },
  stayMeta: { fontSize: 12 },
  relBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 10 },
  relBadgeText: { fontSize: 10, fontWeight: '700' },

  // Calendar
  calendarNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  navBtn: { padding: 8 },
  monthLabel: { fontSize: 16 },
  calendarWrap: { padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  legendToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4, marginBottom: 6 },
  legendToggleText: { fontSize: 12, fontWeight: '600' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
  dayDetail: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10, marginBottom: 4 },
  dayDetailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayDetailTitle: { fontSize: 14 },
  dayStayRow: { paddingLeft: 10, borderLeftWidth: 3, gap: 2 },
});
