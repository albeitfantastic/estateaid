import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { SettingsSheet, type SettingsDestination } from '@/components/settings/settings-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/ui/empty-state';
import { HostProLockTouchable } from '@/components/ui/host-pro-lock';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StatusBadge } from '@/components/ui/badge';
import { SectionHeader } from '@/components/ui/section-header';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Colors, EstateColors, Layout, Radius, type ThemeColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAccessTier, useHasFullHostAccess } from '@/lib/access-tier';
import { addDays, formatDate, formatDateRange, today } from '@/lib/date-utils';
import { getEventOccurrences } from '@/lib/event-utils';
import { navigateToSettingsSection } from '@/lib/settings-navigation';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { useEventStore } from '@/store/event-store';
import { useStayStore } from '@/store/stay-store';
import { useTicketStore } from '@/store/ticket-store';
import type { EstateEvent, Ticket, TicketPriority } from '@/types';

const MAINTENANCE_HOME_HORIZON_DAYS = 120;
const HOME_SECTION_PREVIEW_LIMIT = 3;

const PRIORITY_BAR: Record<TicketPriority, string> = {
  low: '#94a3b8',
  normal: '#0a7ea4',
  high: '#f59e0b',
  urgent: '#ef4444',
};

function isTicketOpenStatus(t: Ticket) {
  return t.status === 'open' || t.status === 'in_progress';
}

function sortOpenTicketsForHome(a: Ticket, b: Ticket) {
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
  if (a.dueDate && !b.dueDate) return -1;
  if (!a.dueDate && b.dueDate) return 1;
  return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
}

function priorityShortLabel(p: TicketPriority, tr: (k: string) => string) {
  if (p === 'urgent' || p === 'high') return tr('ticketsHub.priorityHigh');
  if (p === 'normal') return tr('ticketsHub.priorityMedium');
  return tr('ticketsHub.priorityLow');
}

function getMaintenanceRelativeLabel(
  nextDate: string,
  todayStr: string,
  tr: (key: string, options?: Record<string, unknown>) => string
): string {
  if (nextDate === todayStr) return tr('ownerHome.maintenanceDueToday');
  if (nextDate === addDays(todayStr, 1)) return tr('stayRelative.tomorrow');
  const diffMs = new Date(nextDate + 'T12:00:00').getTime() - new Date(todayStr + 'T12:00:00').getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 1) return tr('stayRelative.inDays', { count: diffDays });
  return formatDate(nextDate);
}

export default function OwnerDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];

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
  const allMaintenanceEvents = useEventStore((s) => s.events);
  const allInvitations = useInvitationStore((s) => s.invitations);
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
    () =>
      allTickets.filter(
        (tk) =>
          estateIds.includes(tk.estateId) && (tk.status === 'open' || tk.status === 'in_progress')
      ).length,
    [allTickets, estateIds]
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
        .slice(0, HOME_SECTION_PREVIEW_LIMIT),
    [allStays, estateIds, todayStr]
  );

  const upcomingMaintenanceRows = useMemo(() => {
    const horizon = addDays(todayStr, MAINTENANCE_HOME_HORIZON_DAYS);
    const owned = allMaintenanceEvents.filter((e) => estateIds.includes(e.estateId));
    const rows: { event: EstateEvent; nextDate: string }[] = [];
    for (const ev of owned) {
      const occ = getEventOccurrences(ev, todayStr, horizon);
      if (occ.length === 0) continue;
      const sorted = [...occ].sort((a, b) => a.localeCompare(b));
      const first = sorted[0];
      if (first) rows.push({ event: ev, nextDate: first });
    }
    rows.sort(
      (a, b) =>
        a.nextDate.localeCompare(b.nextDate) || a.event.title.localeCompare(b.event.title)
    );
    return rows.slice(0, HOME_SECTION_PREVIEW_LIMIT);
  }, [allMaintenanceEvents, estateIds, todayStr]);

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

  const estateById = useMemo(
    () => Object.fromEntries(estates.map((e) => [e.id, e] as const)),
    [estates]
  );

  const openTicketsForHome = useMemo(() => {
    return allTickets
      .filter((tk) => estateIds.includes(tk.estateId) && isTicketOpenStatus(tk))
      .sort(sortOpenTicketsForHome)
      .slice(0, HOME_SECTION_PREVIEW_LIMIT);
  }, [allTickets, estateIds]);

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

        <View style={styles.statsRow}
        >
        <StatCard
            icon="exclamationmark.triangle.fill"
            value={openTicketsCount}
            label="Tickets"
            color={colors.tint}
            colors={colors}
            onPress={() => router.push('/(app)/tickets' as never)}
          />
        </View>







        {/* Upcoming maintenance */}
        <SectionHeader
          title={t('ownerHome.upcomingMaintenance')}
          actionLabel={t('ownerHome.seeAll')}
          onAction={() => router.push('/(app)/calendar' as never)}
          actionHostLocked={!hasHost}
        />
        {upcomingMaintenanceRows.length === 0 ? (
          <EmptyState
            icon="calendar.badge.clock"
            title={t('ownerHome.noUpcomingMaintenanceTitle')}
            subtitle={t('ownerHome.noUpcomingMaintenanceSub')}
          />
        ) : (
          <View style={styles.upcomingList}>
            {upcomingMaintenanceRows.map(({ event: ev, nextDate }) => {
              const estate = estateById[ev.estateId];
              const dotColor = ev.color ?? estateColorMap[ev.estateId] ?? colors.tint;
              const relLabel = getMaintenanceRelativeLabel(nextDate, todayStr, t);
              const typeLabel =
                ev.type === 'recurring'
                  ? t('maintenanceSchedule.typeRecurring')
                  : t('maintenanceSchedule.oneTimeTask');
              return (
                <HostProLockTouchable
                  key={`${ev.id}-${nextDate}`}
                  locked={!hasHost}
                  onPress={() =>
                    router.push(`/(app)/estates/${ev.estateId}/events/${ev.id}` as never)
                  }
                  style={styles.stayRowOuter}
                >
                  <SurfaceCard
                    variant="elevated"
                    padded
                    accentColor={dotColor}
                    accentWidth={4}
                    contentStyle={styles.stayRowInner}
                  >
                    <View style={styles.stayInfo}>
                      <ThemedText type="defaultSemiBold" style={styles.stayGuest} numberOfLines={1}>
                        {ev.title}
                      </ThemedText>
                      <ThemedText type="caption" style={{ color: colors.textSecondary }} numberOfLines={1}>
                        {estate?.name ?? '—'} · {formatDate(nextDate)} · {typeLabel}
                      </ThemedText>
                    </View>
                    <View style={[styles.relBadge, { backgroundColor: colors.tint + '18' }]}>
                      <ThemedText style={[styles.relBadgeText, { color: colors.tint }]}>
                        {relLabel}
                      </ThemedText>
                    </View>
                  </SurfaceCard>
                </HostProLockTouchable>
              );
            })}
          </View>
        )}

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
                    padded={true}
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

        <SectionHeader
          title={t('ownerHome.openTickets')}
          actionLabel={t('ownerHome.seeAll')}
          onAction={() => router.push('/(app)/tickets' as never)}
        />
        {openTicketsForHome.length === 0 ? (
          <EmptyState
            icon="exclamationmark.triangle.fill"
            title={t('ownerHome.noOpenTicketsTitle')}
            subtitle={t('ownerHome.noOpenTicketsSub')}
          />
        ) : (
          <View style={styles.openTicketsList}>
            {openTicketsForHome.map((ticket) => {
              const estateName = estateById[ticket.estateId]?.name ?? '—';
              const barColor = PRIORITY_BAR[ticket.priority];
              return (
                <TouchableOpacity
                  key={ticket.id}
                  style={[styles.ticketRow, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={() =>
                    router.push(`/(app)/estates/${ticket.estateId}/tickets/${ticket.id}` as never)
                  }
                  activeOpacity={0.8}
                >
                  <View style={[styles.ticketPriorityBar, { backgroundColor: barColor }]} />
                  <View style={styles.ticketRowBody}>
                    <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.ticketRowTitle}>
                      {ticket.title}
                    </ThemedText>
                    <ThemedText style={[styles.ticketRowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                      {estateName} · {priorityShortLabel(ticket.priority, t)}
                    </ThemedText>
                    {ticket.dueDate ? (
                      <ThemedText style={[styles.ticketRowDue, { color: colors.textSecondary }]}>
                        {t('ticketsHub.dueShort', { date: formatDate(ticket.dueDate) })}
                      </ThemedText>
                    ) : null}
                  </View>
                  <View style={styles.ticketRowRight}>
                    <StatusBadge status={ticket.status} />
                    <IconSymbol name="chevron.right" size={16} color={colors.icon} />
                  </View>
                </TouchableOpacity>
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

  openTicketsList: { gap: 8, marginBottom: Layout.sectionGap },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    gap: 10,
  },
  ticketPriorityBar: { width: 4, alignSelf: 'stretch' },
  ticketRowBody: { flex: 1, paddingVertical: 12, gap: 2 },
  ticketRowTitle: { fontSize: 15 },
  ticketRowMeta: { fontSize: 12 },
  ticketRowDue: { fontSize: 12, fontWeight: '600' },
  ticketRowRight: { alignItems: 'flex-end', gap: 6, paddingRight: 12 },
});
