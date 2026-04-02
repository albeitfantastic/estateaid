import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { DayInfo, MonthGrid } from '@/components/calendar/month-grid';
import { SettingsSheet, type SettingsDestination } from '@/components/settings/settings-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/ui/empty-state';
import { HostProLockTouchable } from '@/components/ui/host-pro-lock';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionHeader } from '@/components/ui/section-header';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Colors, EstateColors, Layout, Radius, elevationStyle, type ThemeColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAccessTier, useHasFullHostAccess } from '@/lib/access-tier';
import { formatDate, formatDateRange, getDaysInRange, today } from '@/lib/date-utils';
import { showMaisonProUpgradePrompt } from '@/lib/maison-pro-upgrade';
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
  const accessTier = useAccessTier();
  const hasHost = useHasFullHostAccess();

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
          style={[
            styles.menuBtn,
            {
              backgroundColor: colors.tintMuted,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border,
            },
          ]}
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
        accessTier={accessTier}
        selectedTier={selectedTier}
        isDark={isDark}
        notificationsOn={notificationsEnabled}
        onToggleDark={(v: boolean) => setThemePreference(v ? 'dark' : 'light')}
        onToggleNotifications={setNotificationsEnabled}
        onNavigate={(dest: SettingsDestination) => navigateToSettingsSection(router, dest)}
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
            hostLocked={!hasHost}
            onPress={() => router.push('/(app)/estates' as never)}
          />
          <StatCard
            icon="person.2.fill"
            value={guestsCount}
            label={t('ownerHome.guests')}
            color={colors.tint}
            colors={colors}
            hostLocked={!hasHost}
            onPress={() => router.push('/(app)/guests' as never)}
          />
          <StatCard
            icon="tray.fill"
            value={pendingCount}
            label={t('ownerHome.requests')}
            color={colors.tint}
            colors={colors}
            hostLocked={!hasHost}
            onPress={() => router.push('/(app)/stays' as never)}
          />
          {/*}
          <StatCard
            icon="exclamationmark.triangle.fill"
            value={openTicketsCount}
            label="Tickets"
            color="#ef4444"
            colors={colors}
            onPress={() => router.push('/(app)/tickets' as never)}
          />*/}
        </View>
    
        {/* Today's Priorities */}
        {(todayArrivals.length > 0 || todayDepartures.length > 0 || pendingCount > 0) && (
          <View style={styles.priorityRow}>
            {todayArrivals.length > 0 && (
              <HostProLockTouchable
                locked={!hasHost}
                onPress={() => router.push('/(app)/stays' as never)}
                style={[
                  styles.priorityChip,
                  { backgroundColor: colors.success + '16', borderColor: colors.success + '35' },
                ]}
              >
                <IconSymbol name="arrow.down.circle.fill" size={14} color={colors.success} />
                <ThemedText style={[styles.priorityText, { color: colors.success }]}>
                  {t('ownerHome.arriving', { count: todayArrivals.length })}
                </ThemedText>
              </HostProLockTouchable>
            )}
            {todayDepartures.length > 0 && (
              <HostProLockTouchable
                locked={!hasHost}
                onPress={() => router.push('/(app)/stays' as never)}
                style={[
                  styles.priorityChip,
                  { backgroundColor: colors.warning + '18', borderColor: colors.warning + '40' },
                ]}
              >
                <IconSymbol name="arrow.up.circle.fill" size={14} color={colors.warning} />
                <ThemedText style={[styles.priorityText, { color: colors.warning }]}>
                  {t('ownerHome.departing', { count: todayDepartures.length })}
                </ThemedText>
              </HostProLockTouchable>
            )}
            {pendingCount > 0 && (
              <HostProLockTouchable
                locked={!hasHost}
                onPress={() => router.push('/(app)/requests' as never)}
                style={[styles.priorityChip, { backgroundColor: colors.tint + '18', borderColor: colors.tint + '33' }]}
              >
                <IconSymbol name="tray.fill" size={14} color={colors.tint} />
                <ThemedText style={[styles.priorityText, { color: colors.tint }]}>
                  {t('ownerHome.pending', { count: pendingCount })}
                </ThemedText>
              </HostProLockTouchable>
            )}
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <HostProLockTouchable
            locked={!hasHost}
            onPress={() => router.push('/(app)/plan-stay' as never)}
            style={styles.actionTouchable}
          >
            <SurfaceCard
              variant="elevated"
              style={[styles.actionCardShell, { borderTopWidth: 3, borderTopColor: colors.tint }]}
              contentStyle={styles.actionCardInner}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.tintMuted }]}>
                <IconSymbol name="calendar.badge.plus" size={22} color={colors.tint} />
              </View>
              <ThemedText type="defaultSemiBold" style={styles.actionTitle}>
                {t('ownerHome.planStay')}
              </ThemedText>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                {t('ownerHome.planStaySub')}
              </ThemedText>
            </SurfaceCard>
          </HostProLockTouchable>

          <HostProLockTouchable
            locked={!hasHost}
            onPress={() => router.push('/(app)/invite' as never)}
            style={styles.actionTouchable}
          >
            <SurfaceCard
              variant="elevated"
              style={[styles.actionCardShell, { borderTopWidth: 3, borderTopColor: colors.tint }]}
              contentStyle={styles.actionCardInner}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.tintMuted }]}>
                <IconSymbol name="envelope.fill" size={22} color={colors.tint} />
              </View>
              <ThemedText type="defaultSemiBold" style={styles.actionTitle}>
                {t('ownerHome.inviteUser')}
              </ThemedText>
              <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                {t('ownerHome.inviteUserSub')}
              </ThemedText>
            </SurfaceCard>
          </HostProLockTouchable>
        </View>

        {/* Upcoming Stays */}
        <SectionHeader
          title={t('ownerHome.upcomingStays')}
          actionLabel={t('ownerHome.seeAll')}
          onAction={() => router.push('/(app)/stays' as never)}
          actionHostLocked={!hasHost}
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
              const relColor = isActive ? colors.success : colors.tint;
              return (
                <HostProLockTouchable
                  key={stay.id}
                  locked={!hasHost}
                  onPress={() => router.push('/(app)/stays' as never)}
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
                </HostProLockTouchable>
              );
            })}
          </View>
        )}

        {/* Interactive Calendar (host-gated for Standard) */}
        <View style={styles.calendarSectionWrap}>
          <View pointerEvents={hasHost ? 'auto' : 'none'}>
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
          </View>
          {!hasHost && (
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => showMaisonProUpgradePrompt(t)}>
              <View style={styles.calendarLockBadge} pointerEvents="none">
                <IconSymbol name="lock.fill" size={11} color="#fff" />
              </View>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

interface StatCardProps {
  icon: string;
  value: number;
  label: string;
  color: string;
  colors: ThemeColors;
  onPress?: () => void;
  /** Standard tier: show lock; tap opens upgrade prompt. */
  hostLocked?: boolean;
}

function StatCard({ icon, value, label, color, colors, onPress, hostLocked }: StatCardProps) {
  const body = (
    <SurfaceCard
      variant="elevated"
      contentStyle={styles.statCardInner}
      style={{ borderTopWidth: 3, borderTopColor: color }}
    >
      <View style={[styles.statIconWrap, { backgroundColor: colors.tintMuted }]}>
        <IconSymbol name={icon as never} size={20} color={color} />
      </View>
      <ThemedText type="statValue" style={{ color }}>
        {value}
      </ThemedText>
      <ThemedText type="statLabel" style={{ color: colors.textSecondary, textAlign: 'center' }}>
        {label}
      </ThemedText>
    </SurfaceCard>
  );
  if (!onPress) {
    return <View style={styles.statTouchable}>{body}</View>;
  }
  return (
    <HostProLockTouchable
      style={styles.statTouchable}
      locked={!!hostLocked}
      onPress={onPress}
    >
      {body}
    </HostProLockTouchable>
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
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: { fontSize: 30, fontWeight: '700', letterSpacing: -0.8 },
  sub: { marginTop: 6 },
  scroll: { paddingHorizontal: Layout.screenPaddingX },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: Layout.sectionGap },
  statTouchable: { flex: 1 },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardInner: { alignItems: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 8 },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: Layout.sectionGap },
  actionTouchable: { flex: 1 },
  actionCardShell: { flex: 1 },
  actionCardInner: { gap: 8, paddingVertical: 16, paddingHorizontal: 14 },
  actionIcon: {
    width: Layout.touchMin,
    height: Layout.touchMin,
    borderRadius: Radius.lg,
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

  calendarSectionWrap: { position: 'relative', marginBottom: Layout.sectionGap - 8 },
  calendarLockBadge: {
    position: 'absolute',
    top: 40,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Calendar
  calendarCard: {
    borderRadius: Radius.xl,
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
