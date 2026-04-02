import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { DayInfo, MonthGrid } from '@/components/calendar/month-grid';
import { SettingsSheet, type SettingsDestination } from '@/components/settings/settings-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionHeader } from '@/components/ui/section-header';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Colors, EstateColors, Layout, Radius, elevationStyle } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDate, formatDateRange, getDaysInRange, today } from '@/lib/date-utils';
import { navigateToSettingsSection } from '@/lib/settings-navigation';
import { getEventOccurrences, describeRecurrence } from '@/lib/event-utils';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useEventStore } from '@/store/event-store';
import { useInvitationStore } from '@/store/invitation-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { useStayStore } from '@/store/stay-store';
import { useTicketStore } from '@/store/ticket-store';

export default function OwnerDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];

  const monthNames = t('calendar.months', { returnObjects: true }) as string[];

  function getStayRelativeLabel(from: string, to: string, todayStr: string): string {
    if (from === todayStr) return t('stayRelative.arrivingToday');
    if (to === todayStr) return t('stayRelative.departingToday');
    if (from <= todayStr && to >= todayStr) return t('stayRelative.activeStay');
    const diffMs = new Date(from).getTime() - new Date(todayStr).getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return t('stayRelative.tomorrow');
    return t('stayRelative.inDays', { count: diffDays });
  }
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
      <View style={[styles.header, { paddingTop: insets.top + Layout.sectionGap }]}>
        <View style={{ flex: 1 }}>
          <ThemedText type="title" style={styles.greeting}>
            {t('ownerHome.greeting', { name: currentUser?.name.split(' ')[0] ?? '' })}
          </ThemedText>
          <ThemedText type="caption" style={[styles.sub, { color: colors.textSecondary }]}>
            {t('ownerHome.sub')}
          </ThemedText>
        </View>
        <TouchableOpacity
          onPress={() => setMenuOpen(true)}
          style={[styles.menuBtn, { backgroundColor: colors.tint + '14' }]}
          activeOpacity={0.7}
          hitSlop={12}
        >
          <IconSymbol name="line.3.horizontal" size={22} color={colors.tint} />
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
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Layout.sectionGap + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard
            icon="building.2.fill"
            value={estates.length}
            label={t('ownerHome.properties')}
            color={colors.tint}
            colors={colors}
            onPress={() => router.push('/(owner)/estates' as never)}
          />
          <StatCard
            icon="person.2.fill"
            value={guestsCount}
            label={t('ownerHome.guests')}
            color={colors.tint}
            colors={colors}
            onPress={() => router.push('/(owner)/guests' as never)}
          />
          <StatCard
            icon="tray.fill"
            value={pendingCount}
            label={t('ownerHome.requests')}
            color={colors.tint}
            colors={colors}
            onPress={() => router.push('/(owner)/stays' as never)}
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
                  {t('ownerHome.arriving', { count: todayArrivals.length })}
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
                  {t('ownerHome.departing', { count: todayDepartures.length })}
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
                  {t('ownerHome.pending', { count: pendingCount })}
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionTouchable}
            onPress={() => router.push('/(owner)/plan-stay' as never)}
            activeOpacity={0.75}
          >
            <SurfaceCard
              variant="elevated"
              style={[styles.actionCardShell, { borderTopWidth: 3, borderTopColor: colors.tint }]}
              contentStyle={styles.actionCardInner}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.tint + '18' }]}>
                <IconSymbol name="calendar.badge.plus" size={22} color={colors.tint} />
              </View>
              <ThemedText type="defaultSemiBold" style={styles.actionTitle}>
                {t('ownerHome.planStay')}
              </ThemedText>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                {t('ownerHome.planStaySub')}
              </ThemedText>
            </SurfaceCard>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionTouchable}
            onPress={() => router.push('/(owner)/invite' as never)}
            activeOpacity={0.75}
          >
            <SurfaceCard
              variant="elevated"
              style={[styles.actionCardShell, { borderTopWidth: 3, borderTopColor: colors.tint }]}
              contentStyle={styles.actionCardInner}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.tint + '18' }]}>
                <IconSymbol name="envelope.fill" size={22} color={colors.tint} />
              </View>
              <ThemedText type="defaultSemiBold" style={styles.actionTitle}>
                {t('ownerHome.inviteUser')}
              </ThemedText>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                {t('ownerHome.inviteUserSub')}
              </ThemedText>
            </SurfaceCard>
          </TouchableOpacity>
        </View>

        {/* Upcoming Stays */}
        <SectionHeader
          title={t('ownerHome.upcomingStays')}
          actionLabel={t('ownerHome.seeAll')}
          onAction={() => router.push('/(owner)/stays' as never)}
        />
        {upcomingStays.length === 0 ? (
          <EmptyState
            icon="calendar"
            title={t('ownerHome.noUpcomingTitle')}
            subtitle={t('ownerHome.noUpcomingSub')}
          />
        ) : (
          <View style={styles.upcomingList}>
            {upcomingStays.map((stay) => {
              const estate = estates.find((e) => e.id === stay.estateId);
              const isOwnerStay = stay.guestId === currentUser?.id;
              const guestLabel = isOwnerStay
                ? `${currentUser?.name?.split(' ')[0] ?? t('common.you')} ${t('ownerHome.youSuffix')}`
                : resolveUserDisplayName(stay.guestId, profileById);
              const dotColor = estateColorMap[stay.estateId] ?? colors.tint;
              const relLabel = getStayRelativeLabel(stay.from, stay.to, todayStr);
              const isActive = stay.from <= todayStr && stay.to >= todayStr;
              const relColor = isActive ? '#22c55e' : colors.tint;
              return (
                <TouchableOpacity
                  key={stay.id}
                  onPress={() => router.push('/(owner)/stays' as never)}
                  activeOpacity={0.75}
                  style={styles.stayRowOuter}
                >
                  <SurfaceCard
                    variant="elevated"
                    padded={false}
                    accentColor={dotColor}
                    accentWidth={4}
                    contentStyle={styles.stayRowInner}
                  >
                    <View style={styles.stayInfo}>
                      <ThemedText type="defaultSemiBold" style={styles.stayGuest}>
                        {guestLabel}
                      </ThemedText>
                      <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                        {estate?.name} · {formatDateRange(stay.from, stay.to)}
                      </ThemedText>
                    </View>
                    <View style={[styles.relBadge, { backgroundColor: relColor + '18' }]}>
                      <ThemedText style={[styles.relBadgeText, { color: relColor }]}>{relLabel}</ThemedText>
                    </View>
                  </SurfaceCard>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Interactive Calendar */}
        <SectionHeader title={t('ownerHome.thisMonth')} />
        <View
          style={[
            styles.calendarCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            elevationStyle('card', scheme),
          ]}
        >
          <View style={[styles.calendarNav, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={prevMonth} style={[styles.navBtn, { backgroundColor: colors.surfaceMuted }]}>
              <IconSymbol name="arrow.left" size={20} color={colors.tint} />
            </TouchableOpacity>
            <ThemedText type="defaultSemiBold" style={[styles.monthLabel, { color: colors.text }]}>
              {monthNames[viewMonth]} {viewYear}
            </ThemedText>
            <TouchableOpacity onPress={nextMonth} style={[styles.navBtn, { backgroundColor: colors.surfaceMuted }]}>
              <IconSymbol name="arrow.right" size={20} color={colors.tint} />
            </TouchableOpacity>
          </View>
          <View style={[styles.calendarGridPad, { backgroundColor: colors.surfaceMuted }]}>
            <MonthGrid
              year={viewYear}
              month={viewMonth}
              dayInfoMap={dayInfoMap}
              selectedDay={selectedDay ?? undefined}
              onDayPress={(d) => setSelectedDay(selectedDay === d ? null : d)}
            />
          </View>
        </View>

        {(estates.length > 0 || estateEvents.length > 0) && (
          <>
            <TouchableOpacity
              style={styles.legendToggle}
              onPress={() => setLegendOpen((o) => !o)}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.legendToggleText, { color: colors.textSecondary }]}>
                {t('ownerHome.legend')}
              </ThemedText>
              <IconSymbol name={legendOpen ? 'chevron.up' : 'chevron.down'} size={14} color={colors.textSecondary} />
            </TouchableOpacity>
            {legendOpen && (
              <View style={styles.legend}>
                {estates.map((e, i) => (
                  <View
                    key={e.id}
                    style={[styles.legendItem, { backgroundColor: colors.surfaceMuted, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]}
                  >
                    <View style={[styles.legendDot, { backgroundColor: EstateColors[i % EstateColors.length] }]} />
                    <ThemedText style={[styles.legendText, { color: colors.text }]} numberOfLines={1}>
                      {e.name}
                    </ThemedText>
                  </View>
                ))}
                {estateEvents.map((ev) => (
                  <View
                    key={ev.id}
                    style={[styles.legendItem, { backgroundColor: colors.surfaceMuted, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]}
                  >
                    <View style={[styles.legendDot, { backgroundColor: ev.color ?? '#64748B' }]} />
                    <ThemedText style={[styles.legendText, { color: colors.text }]} numberOfLines={1}>
                      {ev.title}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {selectedDay && (
          <View
            style={[
              styles.dayDetail,
              { backgroundColor: colors.surface, borderColor: colors.border },
              elevationStyle('row', scheme),
            ]}
          >
            <View style={styles.dayDetailHeader}>
              <ThemedText type="defaultSemiBold" style={[styles.dayDetailTitle, { color: colors.text }]}>
                {formatDate(selectedDay)}
              </ThemedText>
              <TouchableOpacity
                onPress={() => setSelectedDay(null)}
                style={[styles.dayDetailClose, { backgroundColor: colors.surfaceMuted }]}
                hitSlop={8}
              >
                <IconSymbol name="xmark" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {staysOnSelectedDay.length === 0 && eventsOnSelectedDay.length === 0 && (
              <ThemedText style={[styles.stayMeta, { color: colors.textSecondary }]}>
                {t('ownerHome.nothingScheduled')}
              </ThemedText>
            )}
            {staysOnSelectedDay.map((stay) => {
              const estate = estates.find((e) => e.id === stay.estateId);
              const dotColor = estateColorMap[stay.estateId] ?? colors.tint;
              const guestLabel =
                stay.guestId === currentUser?.id
                  ? (currentUser?.name ?? t('common.you'))
                  : resolveUserDisplayName(stay.guestId, profileById);
              return (
                <View key={stay.id} style={[styles.dayStayRow, { borderLeftColor: dotColor }]}>
                  <ThemedText type="defaultSemiBold">{guestLabel}</ThemedText>
                  <ThemedText style={[styles.stayMeta, { color: colors.textSecondary }]}>
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
                  <ThemedText style={[styles.stayMeta, { color: colors.textSecondary }]}>
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
      style={styles.statTouchable}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.75 : 1}
    >
      <SurfaceCard
        variant="elevated"
        contentStyle={styles.statCardInner}
        style={{ borderTopWidth: 3, borderTopColor: color }}
      >
        <IconSymbol name={icon as never} size={22} color={color} />
        <ThemedText type="statValue" style={{ color }}>
          {value}
        </ThemedText>
        <ThemedText type="statLabel" style={{ color: colors.textSecondary, textAlign: 'center' }}>
          {label}
        </ThemedText>
      </SurfaceCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPaddingX,
    paddingBottom: Layout.sectionGap,
    gap: 12,
  },
  menuBtn: {
    width: Layout.touchMin,
    height: Layout.touchMin,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: { fontSize: 28, fontWeight: '700' },
  sub: { marginTop: 4 },
  scroll: { paddingHorizontal: Layout.screenPaddingX },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: Layout.sectionGap },
  statTouchable: { flex: 1 },
  statCardInner: { alignItems: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 8 },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: Layout.sectionGap },
  actionTouchable: { flex: 1 },
  actionCardShell: { flex: 1 },
  actionCardInner: { gap: 8, paddingVertical: 16, paddingHorizontal: 14 },
  actionIcon: {
    width: Layout.touchMin,
    height: Layout.touchMin,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: { fontSize: 15 },

  // Today's priorities
  priorityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Layout.sectionGap },
  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  priorityText: { fontSize: 13, fontWeight: '600' },

  // Upcoming stays
  upcomingList: { gap: 10, marginBottom: 8 },
  stayRowOuter: { marginBottom: 2 },
  stayRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 12,
    gap: 8,
  },
  stayInfo: { flex: 1, gap: 4 },
  stayGuest: { fontSize: 15 },
  relBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm, marginRight: 4 },
  relBadgeText: { fontSize: 11, fontWeight: '700' },

  // Calendar
  calendarCard: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Layout.sectionGap - 6,
    overflow: 'hidden',
  },
  calendarNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: {
    minWidth: Layout.touchMin,
    minHeight: Layout.touchMin,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: { fontSize: 18, letterSpacing: -0.3 },
  calendarGridPad: { paddingHorizontal: 8, paddingTop: 10, paddingBottom: 12 },
  legendToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  legendToggleText: { fontSize: 13, fontWeight: '600' },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Layout.sectionGap - 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    maxWidth: '100%',
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 13, flexShrink: 1 },
  dayDetail: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Layout.sectionGap - 4,
    gap: 12,
    marginBottom: 8,
  },
  dayDetailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  dayDetailTitle: { fontSize: 17, flex: 1 },
  dayDetailClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stayMeta: { fontSize: 13, lineHeight: 18 },
  dayStayRow: {
    paddingLeft: 12,
    paddingVertical: 4,
    borderLeftWidth: 3,
    gap: 4,
  },
});
