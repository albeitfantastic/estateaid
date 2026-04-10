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
import type { Estate, EstateEvent, Stay, Ticket, TicketPriority } from '@/types';

const MAINTENANCE_HOME_HORIZON_DAYS = 120;
const UPCOMING_PREVIEW_LIMIT = 5;

const PRIORITY_ORDER: Record<TicketPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const PRIORITY_BAR: Record<TicketPriority, string> = {
  low: '#94a3b8',
  normal: '#0a7ea4',
  high: '#f59e0b',
  urgent: '#ef4444',
};

function isTicketOpenStatus(t: Ticket) {
  return t.status === 'open' || t.status === 'in_progress';
}

function getMaintenanceRelativeLabel(
  nextDate: string,
  todayStr: string,
  tr: (key: string, options?: Record<string, unknown>) => string
): string {
  if (nextDate === todayStr) return tr('ownerHome.maintenanceDueToday');
  if (nextDate === addDays(todayStr, 1)) return tr('stayRelative.tomorrow');
  const diffMs =
    new Date(nextDate + 'T12:00:00').getTime() - new Date(todayStr + 'T12:00:00').getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 1) return tr('stayRelative.inDays', { count: diffDays });
  return formatDate(nextDate);
}

type UpcomingItem =
  | {
      kind: 'stay';
      stay: Stay;
      estate?: Estate;
      guestLabel: string;
      dotColor: string;
      relLabel: string;
      isActive: boolean;
      sortDate: string;
    }
  | {
      kind: 'maintenance';
      event: EstateEvent;
      estate?: Estate;
      nextDate: string;
      dotColor: string;
      relLabel: string;
      typeLabel: string;
      sortDate: string;
    };

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

  const estateColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    estates.forEach((e, i) => {
      map[e.id] = EstateColors[i % EstateColors.length];
    });
    return map;
  }, [estates]);

  const estateById = useMemo(
    () => Object.fromEntries(estates.map((e) => [e.id, e] as const)),
    [estates]
  );

  const pendingCount = useMemo(
    () =>
      allStayRequests.filter((r) => estateIds.includes(r.estateId) && r.status === 'pending')
        .length,
    [allStayRequests, estateIds]
  );

  const openTicketsCount = useMemo(
    () =>
      allTickets.filter(
        (tk) => estateIds.includes(tk.estateId) && (tk.status === 'open' || tk.status === 'in_progress')
      ).length,
    [allTickets, estateIds]
  );

  const guestsCount = useMemo(() => {
    const ids = new Set(
      allInvitations
        .filter(
          (inv) => estateIds.includes(inv.estateId) && inv.status === 'accepted' && inv.guestId
        )
        .map((inv) => inv.guestId!)
    );
    return ids.size;
  }, [allInvitations, estateIds]);

  // Hero: open tickets sorted by urgency then due date, top 3
  const heroTickets = useMemo(() => {
    return allTickets
      .filter((tk) => estateIds.includes(tk.estateId) && isTicketOpenStatus(tk))
      .sort((a, b) => {
        const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (pd !== 0) return pd;
        if (a.dueDate && b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      })
      .slice(0, 3);
  }, [allTickets, estateIds]);

  const hasAttentionItems = heroTickets.length > 0;

  // Unified upcoming: merge stays + maintenance sorted by date
  const upcomingItems = useMemo((): UpcomingItem[] => {
    const horizon = addDays(todayStr, MAINTENANCE_HOME_HORIZON_DAYS);

    const stayItems: UpcomingItem[] = allStays
      .filter((s) => estateIds.includes(s.estateId) && s.to >= todayStr)
      .map((s) => {
        const estate = estateById[s.estateId];
        const isOwnerStay = s.guestId === currentUser?.id;
        const guestLabel = isOwnerStay
          ? `${currentUser?.name?.split(' ')[0] ?? t('common.you')} ${t('ownerHome.youSuffix')}`
          : resolveUserDisplayName(s.guestId, profileById);
        const dotColor = estateColorMap[s.estateId] ?? colors.tint;
        const relLabel = getStayRelativeLabel(s.from, s.to, todayStr);
        const isActive = s.from <= todayStr && s.to >= todayStr;
        return {
          kind: 'stay' as const,
          stay: s,
          estate,
          guestLabel,
          dotColor,
          relLabel,
          isActive,
          sortDate: s.from,
        };
      });

    const maintItems: UpcomingItem[] = [];
    for (const ev of allMaintenanceEvents.filter((e) => estateIds.includes(e.estateId))) {
      const occ = getEventOccurrences(ev, todayStr, horizon);
      if (!occ.length) continue;
      const nextDate = [...occ].sort((a, b) => a.localeCompare(b))[0]!;
      const estate = estateById[ev.estateId];
      const dotColor = ev.color ?? estateColorMap[ev.estateId] ?? colors.tint;
      const relLabel = getMaintenanceRelativeLabel(nextDate, todayStr, t);
      const typeLabel =
        ev.type === 'recurring'
          ? t('maintenanceSchedule.typeRecurring')
          : t('maintenanceSchedule.oneTimeTask');
      maintItems.push({
        kind: 'maintenance' as const,
        event: ev,
        estate,
        nextDate,
        dotColor,
        relLabel,
        typeLabel,
        sortDate: nextDate,
      });
    }

    return [...stayItems, ...maintItems]
      .sort((a, b) => a.sortDate.localeCompare(b.sortDate))
      .slice(0, UPCOMING_PREVIEW_LIMIT);
  }, [
    allStays,
    allMaintenanceEvents,
    estateIds,
    estateById,
    estateColorMap,
    todayStr,
    currentUser?.id,
    currentUser?.name,
    profileById,
    colors.tint,
    t,
  ]);

  const firstName = currentUser?.name?.split(' ')[0] ?? '';

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={{ flex: 1 }}>
          <ThemedText type="title" style={styles.greeting}>
            Hello, {firstName}
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
        currentUser={
          currentUser ? { name: currentUser.name, email: currentUser.email } : null
        }
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
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + Layout.sectionGap + 12 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Needs Attention (hero) ─────────────────────────────── */}
        {hasAttentionItems && (
          <SectionHeader title={t('ownerHome.needsAttention')} />
        )}

        {heroTickets.length > 0 && (
          <View style={styles.heroList}>
            {heroTickets.map((ticket) => {
              const estateName = estateById[ticket.estateId]?.name ?? '—';
              const barColor = PRIORITY_BAR[ticket.priority];
              const isUrgent = ticket.priority === 'urgent';
              const isHigh = ticket.priority === 'high';
              return (
                <NextActionCard
                  key={ticket.id}
                  ticket={ticket}
                  estateName={estateName}
                  barColor={barColor}
                  isUrgent={isUrgent}
                  isHigh={isHigh}
                  colors={colors}
                  onPress={() =>
                    router.push(
                      `/(app)/estates/${ticket.estateId}/tickets/${ticket.id}` as never
                    )
                  }
                />
              );
            })}
          </View>
        )}

        {!hasAttentionItems && (
          <View
            style={[
              styles.allClear,
              { backgroundColor: colors.success + '10', borderColor: colors.success + '28' },
            ]}
          >
            <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success} />
            <ThemedText style={[styles.allClearText, { color: colors.success }]}>
              Nothing needs attention right now
            </ThemedText>
          </View>
        )}

        {/* ── Overview strip ─────────────────────────────────────── */}
        <SurfaceCard variant="elevated" style={styles.overviewCard}>
          <View style={styles.overviewRow}>
            <HostProLockTouchable
              locked={false}
              onPress={() => router.push('/(app)/estates' as never)}
              style={styles.overviewStatWrap}
            >
              <View style={styles.overviewStatContent}>
                <IconSymbol name="building.2.fill" size={18} color={colors.tint} />
                <ThemedText type="statValue" style={[styles.overviewVal, { color: colors.tint }]}>
                  {estates.length}
                </ThemedText>
                <ThemedText style={[styles.overviewLabel, { color: colors.textSecondary }]}>
                  {t('ownerHome.properties')}
                </ThemedText>
              </View>
            </HostProLockTouchable>

            <View style={[styles.overviewDivider, { backgroundColor: colors.border }]} />

            <HostProLockTouchable
              locked={!hasHost}
              onPress={() => router.push('/(app)/guests' as never)}
              style={styles.overviewStatWrap}
            >
              <View style={styles.overviewStatContent}>
                <IconSymbol name="person.2.fill" size={18} color={colors.tint} />
                <ThemedText type="statValue" style={[styles.overviewVal, { color: colors.tint }]}>
                  {guestsCount}
                </ThemedText>
                <ThemedText style={[styles.overviewLabel, { color: colors.textSecondary }]}>
                  {t('ownerHome.guests')}
                </ThemedText>
              </View>
            </HostProLockTouchable>

            <View style={[styles.overviewDivider, { backgroundColor: colors.border }]} />

            <HostProLockTouchable
              locked={!hasHost}
              onPress={() => router.push('/(app)/stays' as never)}
              style={styles.overviewStatWrap}
            >
              <View style={styles.overviewStatContent}>
                <IconSymbol name="tray.fill" size={18} color={colors.tint} />
                <ThemedText type="statValue" style={[styles.overviewVal, { color: colors.tint }]}>
                  {pendingCount}
                </ThemedText>
                <ThemedText style={[styles.overviewLabel, { color: colors.textSecondary }]}>
                  {t('ownerHome.requests')}
                </ThemedText>
              </View>
            </HostProLockTouchable>

            <View style={[styles.overviewDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              onPress={() => router.push('/(app)/tickets' as never)}
              style={[styles.overviewStatWrap, styles.overviewStatContent]}
              activeOpacity={0.75}
            >
              <IconSymbol name="exclamationmark.triangle.fill" size={18} color={colors.tint} />
              <ThemedText type="statValue" style={[styles.overviewVal, { color: colors.tint }]}>
                {openTicketsCount}
              </ThemedText>
              <ThemedText style={[styles.overviewLabel, { color: colors.textSecondary }]}>
                Tickets
              </ThemedText>
            </TouchableOpacity>
          </View>
        </SurfaceCard>

        {/* ── Quick Actions ──────────────────────────────────────── */}
        <View style={styles.quickActionRow}>
          <HostProLockTouchable
            locked={!hasHost}
            onPress={() => router.push('/(app)/plan-stay' as never)}
            style={styles.quickActionTouchable}
          >
            <View style={[styles.quickActionCard, { backgroundColor: colors.tint }]}>
              <View style={[styles.quickActionIconWrap, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <IconSymbol name="calendar.badge.plus" size={20} color="#fff" />
              </View>
              <ThemedText style={styles.quickActionTitle}>{t('ownerHome.planStay')}</ThemedText>
              <ThemedText style={styles.quickActionSub}>{t('ownerHome.planStaySub')}</ThemedText>
            </View>
          </HostProLockTouchable>

          <HostProLockTouchable
            locked={!hasHost}
            onPress={() => router.push('/(app)/invite' as never)}
            style={styles.quickActionTouchable}
          >
            <View style={[styles.quickActionCard, { backgroundColor: colors.tint }]}>
              <View style={[styles.quickActionIconWrap, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <IconSymbol name="envelope.fill" size={20} color="#fff" />
              </View>
              <ThemedText style={styles.quickActionTitle}>{t('ownerHome.inviteUser')}</ThemedText>
              <ThemedText style={styles.quickActionSub}>{t('ownerHome.inviteUserSub')}</ThemedText>
            </View>
          </HostProLockTouchable>
        </View>

        {/* ── Upcoming (unified) ─────────────────────────────────── */}
        <SectionHeader
          title={t('ownerHome.upcoming')}
          actionLabel={t('ownerHome.seeAll')}
          onAction={() => router.push('/(app)/calendar' as never)}
          actionHostLocked={!hasHost}
        />

        {upcomingItems.length === 0 ? (
          <EmptyState
            icon="calendar"
            title={t('ownerHome.noUpcomingTitle')}
            actionLabel={t('ownerHome.browseCalendar')}
            onAction={() => router.push('/(app)/calendar' as never)}
          />
        ) : (
          <View style={styles.upcomingList}>
            {upcomingItems.map((item) => {
              if (item.kind === 'stay') {
                const isActive = item.isActive;
                const relColor = isActive ? colors.success : colors.tint;
                return (
                  <HostProLockTouchable
                    key={item.stay.id}
                    locked={!hasHost}
                    onPress={() => router.push('/(app)/stays' as never)}
                    style={styles.upcomingRowOuter}
                  >
                    <SurfaceCard
                      variant="elevated"
                      padded
                      accentColor={item.dotColor}
                      accentWidth={4}
                      contentStyle={styles.upcomingRowInner}
                    >
                      <IconSymbol
                        name="person.fill"
                        size={15}
                        color={colors.icon}
                        style={styles.upcomingTypeIcon}
                      />
                      <View style={styles.upcomingInfo}>
                        <ThemedText
                          type="defaultSemiBold"
                          style={styles.upcomingTitle}
                          numberOfLines={1}
                        >
                          {item.guestLabel}
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          style={{ color: colors.textSecondary }}
                          numberOfLines={1}
                        >
                          {item.estate?.name} · {formatDateRange(item.stay.from, item.stay.to)}
                        </ThemedText>
                      </View>
                      <View
                        style={[styles.relBadge, { backgroundColor: relColor + '18' }]}
                      >
                        <ThemedText style={[styles.relBadgeText, { color: relColor }]}>
                          {item.relLabel}
                        </ThemedText>
                      </View>
                    </SurfaceCard>
                  </HostProLockTouchable>
                );
              }

              // maintenance
              return (
                <HostProLockTouchable
                  key={`${item.event.id}-${item.nextDate}`}
                  locked={!hasHost}
                  onPress={() =>
                    router.push(
                      `/(app)/estates/${item.event.estateId}/events/${item.event.id}` as never
                    )
                  }
                  style={styles.upcomingRowOuter}
                >
                  <SurfaceCard
                    variant="elevated"
                    padded
                    accentColor={item.dotColor}
                    accentWidth={4}
                    contentStyle={styles.upcomingRowInner}
                  >
                    <IconSymbol
                      name="wrench.fill"
                      size={15}
                      color={colors.icon}
                      style={styles.upcomingTypeIcon}
                    />
                    <View style={styles.upcomingInfo}>
                      <ThemedText
                        type="defaultSemiBold"
                        style={styles.upcomingTitle}
                        numberOfLines={1}
                      >
                        {item.event.title}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={{ color: colors.textSecondary }}
                        numberOfLines={1}
                      >
                        {item.estate?.name ?? '—'} · {formatDate(item.nextDate)} · {item.typeLabel}
                      </ThemedText>
                    </View>
                    <View style={[styles.relBadge, { backgroundColor: colors.tint + '18' }]}>
                      <ThemedText style={[styles.relBadgeText, { color: colors.tint }]}>
                        {item.relLabel}
                      </ThemedText>
                    </View>
                  </SurfaceCard>
                </HostProLockTouchable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

// ── NextActionCard ─────────────────────────────────────────────────────────────

interface NextActionCardProps {
  ticket: Ticket;
  estateName: string;
  barColor: string;
  isUrgent: boolean;
  isHigh: boolean;
  colors: ThemeColors;
  onPress: () => void;
}

function NextActionCard({
  ticket,
  estateName,
  barColor,
  isUrgent,
  isHigh,
  colors,
  onPress,
}: NextActionCardProps) {
  const bgTint = isUrgent
    ? colors.error + '10'
    : isHigh
    ? colors.warning + '10'
    : undefined;
  const borderTint = isUrgent
    ? colors.error + '28'
    : isHigh
    ? colors.warning + '28'
    : colors.border;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.nextActionCard,
        {
          backgroundColor: bgTint ?? colors.surface,
          borderColor: borderTint,
        },
      ]}
    >
      <View style={[styles.nextActionBar, { backgroundColor: barColor }]} />
      <View style={styles.nextActionBody}>
        <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.nextActionTitle}>
          {ticket.title}
        </ThemedText>
        <ThemedText style={[styles.nextActionMeta, { color: colors.textSecondary }]} numberOfLines={1}>
          {estateName}
          {ticket.dueDate ? ` · Due ${formatDate(ticket.dueDate)}` : ''}
        </ThemedText>
      </View>
      <View style={styles.nextActionRight}>
        <StatusBadge status={ticket.status} />
        <IconSymbol name="chevron.right" size={15} color={colors.icon} />
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPaddingX,
    paddingBottom: 12,
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
  sub: { marginTop: 4 },

  scroll: { paddingHorizontal: Layout.screenPaddingX },

  // Hero
  heroList: { gap: 8, marginBottom: 10 },

  nextActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    minHeight: 64,
  },
  nextActionBar: { width: 5, alignSelf: 'stretch' },
  nextActionBody: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, gap: 3 },
  nextActionTitle: { fontSize: 15 },
  nextActionMeta: { fontSize: 12 },
  nextActionRight: { alignItems: 'flex-end', gap: 6, paddingRight: 14, paddingLeft: 4 },

  // All clear
  allClear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Layout.sectionGap,
  },
  allClearText: { fontSize: 14, fontWeight: '500' },

  // Overview strip
  overviewCard: { marginBottom: Layout.sectionGap },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  /** Outer cell in overview row (HostProLockTouchable applies style to wrapper View). */
  overviewStatWrap: { flex: 1 },
  /** Shared column layout for icon + value + label (inside pressable). */
  overviewStatContent: {
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
    width: '100%',
  },
  overviewDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    marginHorizontal: 2,
  },
  overviewVal: { fontSize: 22, fontWeight: '700', lineHeight: 26 },
  overviewLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // Quick actions
  quickActionRow: { flexDirection: 'row', gap: 12, marginBottom: Layout.sectionGap },
  quickActionTouchable: { flex: 1 },
  quickActionCard: {
    borderRadius: Radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 8,
  },
  quickActionIconWrap: {
    width: Layout.touchMin,
    height: Layout.touchMin,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  quickActionSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 17,
  },

  // Upcoming
  upcomingList: { gap: 10, marginBottom: 8 },
  upcomingRowOuter: { marginBottom: 2 },
  upcomingRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingRight: 12,
    gap: 10,
  },
  upcomingTypeIcon: { marginLeft: 2 },
  upcomingInfo: { flex: 1, gap: 3 },
  upcomingTitle: { fontSize: 15 },

  relBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    marginRight: 4,
  },
  relBadgeText: { fontSize: 11, fontWeight: '700' },
});
