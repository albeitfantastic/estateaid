import {
  Animated,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemo, useRef, useState } from 'react';

import { MonthGrid, DayInfo } from '@/components/calendar/month-grid';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/section-header';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, EstateColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useStayStore } from '@/store/stay-store';
import { useTicketStore } from '@/store/ticket-store';
import { SEED_USERS } from '@/store/seed-data';
import { today, getDaysInRange, formatDateRange } from '@/lib/date-utils';

const FAB_ITEMS: { icon: string; label: string; route: string }[] = [
  { icon: 'building.2.fill', label: 'New Estate', route: '/(owner)/estates/new' },
  { icon: 'envelope.fill', label: 'Invite User', route: '/(owner)/invite' },
  { icon: 'calendar.badge.plus', label: 'Plan Stay', route: '/(owner)/plan-stay' },
  { icon: 'ticket.fill', label: 'New Ticket', route: '/(owner)/new-ticket' },
];

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

  // Upcoming stays (from today, sorted)
  const upcomingStays = useMemo(
    () =>
      allStays
        .filter((s) => estateIds.includes(s.estateId) && s.to >= todayStr)
        .sort((a, b) => a.from.localeCompare(b.from))
        .slice(0, 5),
    [allStays, estateIds, todayStr]
  );

  // Estate color map
  const estateColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    estates.forEach((e, i) => { map[e.id] = EstateColors[i % EstateColors.length]; });
    return map;
  }, [estates]);

  // Mini calendar
  const now = new Date();
  const viewYear = now.getFullYear();
  const viewMonth = now.getMonth();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

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

  // FAB
  const [fabOpen, setFabOpen] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;

  function toggleFab() {
    const toValue = fabOpen ? 0 : 1;
    Animated.spring(fabAnim, { toValue, useNativeDriver: true, tension: 80, friction: 10 }).start();
    setFabOpen((prev) => !prev);
  }

  function handleFabItem(route: string) {
    setFabOpen(false);
    fabAnim.setValue(0);
    router.push(route as never);
  }

  const fabRotation = fabAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View>
          <ThemedText type="title" style={styles.greeting}>
            Good day, {currentUser?.name.split(' ')[0]}
          </ThemedText>
          <ThemedText style={[styles.sub, { color: colors.icon }]}>Your estate dashboard</ThemedText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 96 }]}
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
            value={activeStays.length}
            label="Active Guests"
            color="#22c55e"
            colors={colors}
            onPress={() => router.push('/(owner)/visitors' as never)}
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

        {/* Upcoming Stays */}
        <SectionHeader
          title="Upcoming Stays"
          actionLabel="See All"
          onAction={() => router.push('/(owner)/visitors' as never)}
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

        {/* Mini Calendar */}
        <SectionHeader title="This Month" />
        <View style={[styles.calendarWrap, { backgroundColor: colors.background, borderColor: colors.icon + '22' }]}>
          <MonthGrid
            year={viewYear}
            month={viewMonth}
            dayInfoMap={dayInfoMap}
            onDayPress={(d) => setSelectedDay(selectedDay === d ? null : d)}
          />
        </View>

        {/* Legend */}
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

        {/* Selected day detail */}
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

      {/* FAB backdrop */}
      {fabOpen && (
        <TouchableWithoutFeedback onPress={toggleFab}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
      )}

      {/* FAB speed-dial */}
      <View style={[styles.fabContainer, { bottom: insets.bottom + 24 }]}>
        {fabOpen &&
          FAB_ITEMS.map((item, index) => {
            const translateY = fabAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -(index + 1) * 64],
            });
            const opacity = fabAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0, 1],
            });
            return (
              <Animated.View
                key={item.route}
                style={[styles.fabItemWrap, { transform: [{ translateY }], opacity }]}
              >
                <TouchableOpacity
                  style={[styles.fabItemLabel, { backgroundColor: colors.background, borderColor: colors.icon + '33' }]}
                  onPress={() => handleFabItem(item.route)}
                  activeOpacity={0.8}
                >
                  <ThemedText style={styles.fabItemLabelText}>{item.label}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.fabItemBtn, { backgroundColor: colors.tint + 'ee' }]}
                  onPress={() => handleFabItem(item.route)}
                  activeOpacity={0.8}
                >
                  <IconSymbol name={item.icon as never} size={18} color="#fff" />
                </TouchableOpacity>
              </Animated.View>
            );
          })}

        {/* Main FAB */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.tint }]}
          onPress={toggleFab}
          activeOpacity={0.85}
        >
          <Animated.View style={{ transform: [{ rotate: fabRotation }] }}>
            <IconSymbol name="plus" size={24} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </View>
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  greeting: { fontSize: 28, fontWeight: '700' },
  sub: { fontSize: 14, marginTop: 2 },
  scroll: { paddingHorizontal: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  statCard: { flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 10, textAlign: 'center' },

  // Upcoming stays
  upcomingList: { gap: 8, marginBottom: 4 },
  stayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  colorBar: { width: 4, alignSelf: 'stretch' },
  stayInfo: { flex: 1, padding: 12, gap: 2 },
  stayGuest: { fontSize: 14 },
  stayMeta: { fontSize: 12 },

  // Mini calendar
  calendarWrap: { padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
  dayDetail: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginBottom: 4,
  },
  dayDetailTitle: { fontSize: 14, marginBottom: 2 },
  dayStayRow: { paddingLeft: 10, borderLeftWidth: 3, gap: 2 },

  // FAB
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    alignItems: 'flex-end',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  fabItemWrap: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fabItemBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  fabItemLabel: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  fabItemLabelText: { fontSize: 13, fontWeight: '600' },
});
