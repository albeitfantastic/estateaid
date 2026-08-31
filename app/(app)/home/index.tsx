import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { useAccessTier } from '@/lib/access-tier';
import { useCan } from '@/lib/entitlements/capabilities';
import { getEstateActorRole } from '@/lib/estate-role';
import { openEstateCreatePaywall } from '@/lib/maison-pro-upgrade';
import { homeEmphasisFor, type OnboardingUseCase } from '@/lib/onboarding-starters';
import { fetchProfileUseCase } from '@/lib/use-case-profile';
import { addDays, formatDate, formatDateRange, today } from '@/lib/date-utils';
import { getEventOccurrences } from '@/lib/event-utils';
import { navigateToSettingsSection } from '@/lib/settings-navigation';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { useEventStore } from '@/store/event-store';
import { useStayStore } from '@/store/stay-store';
import { isIssueOpenStatus, isIssueTask } from '@/lib/issue-task';
import type { Estate, EstateEvent, IssuePriority, Stay } from '@/types';

const MAINTENANCE_HOME_HORIZON_DAYS = 120;
const UPCOMING_PREVIEW_LIMIT = 5;

const PRIORITY_ORDER: Record<IssuePriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const PRIORITY_BAR: Record<IssuePriority, string> = {
  low: '#94a3b8',
  normal: '#0a7ea4',
  high: '#f59e0b',
  urgent: '#ef4444',
};

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

export default function HomeDashboard() {
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
    notificationsEnabled,
    setNotificationsEnabled,
  } = useAuthStore();
  const isDark = themePreference === 'dark';
  const [menuOpen, setMenuOpen] = useState(false);

  const allEstates = useEstateStore((s) => s.estates);
  const allStayRequests = useStayStore((s) => s.stayRequests);
  const allStays = useStayStore((s) => s.stays);
  const allMaintenanceEvents = useEventStore((s) => s.events);
  const allInvitations = useInvitationStore((s) => s.invitations);
  const todayStr = today();
  const profileById = useProfileStore((s) => s.byId);
  const accessTier = useAccessTier();
  const can = useCan();
  const hostEstateIds = useMemo(() => {
    if (!currentUser) return [] as string[];
    return allEstates
      .filter((e) => {
        const role = getEstateActorRole(
          allEstates,
          allInvitations,
          e.id,
          currentUser.id,
          currentUser.email
        );
        return role === 'sponsor' || role === 'coOwner';
      })
      .map((e) => e.id);
  }, [allEstates, allInvitations, currentUser]);

  const canInvite = hostEstateIds.some((id) => can('guests.invite', id));
  const canApprove = hostEstateIds.some((id) => can('stays.approve', id));
  const canWriteEvents = hostEstateIds.some((id) => can('events.write', id));
  const canAddEstate = can('estate.create');
  const isCoOwnerElsewhere = useMemo(() => {
    if (!currentUser) return false;
    return allEstates.some((e) => {
      const role = getEstateActorRole(allEstates, allInvitations, e.id, currentUser.id, currentUser.email);
      return role === 'coOwner';
    });
  }, [allEstates, allInvitations, currentUser]);
  const [useCase, setUseCase] = useState<OnboardingUseCase | null>(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    void fetchProfileUseCase(currentUser.id).then(setUseCase);
  }, [currentUser?.id]);

  const useCaseTip = homeEmphasisFor(useCase);

  const estates = useMemo(
    () =>
      allEstates.filter((e) => {
        if (!currentUser) return false;
        const role = getEstateActorRole(
          allEstates,
          allInvitations,
          e.id,
          currentUser.id,
          currentUser.email
        );
        return role === 'sponsor' || role === 'coOwner';
      }),
    [allEstates, allInvitations, currentUser]
  );
  const estateIds = useMemo(() => estates.map((e) => e.id), [estates]);

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7410/ingest/3b21f73e-4d1e-45e8-beb0-f14c26a6554d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '1393f3' },
      body: JSON.stringify({
        sessionId: '1393f3',
        runId: 'pre-fix',
        hypothesisId: 'B',
        location: 'home/index.tsx:caps',
        message: 'home capability snapshot',
        data: {
          accessTier,
          canInvite,
          canApprove,
          canWriteEvents,
          canAddEstate,
          ownedCount: estates.length,
          useCase,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }, [accessTier, canInvite, canApprove, canWriteEvents, canAddEstate, estates.length, useCase]);
  // #endregion

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

  const openIssuesCount = useMemo(
    () =>
      allMaintenanceEvents.filter(
        (ev) =>
          estateIds.includes(ev.estateId) &&
          isIssueTask(ev) &&
          isIssueOpenStatus(ev.status)
      ).length,
    [allMaintenanceEvents, estateIds]
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

  // Hero: open issues sorted by urgency then due date, top 3
  const heroIssues = useMemo(() => {
    return allMaintenanceEvents
      .filter(
        (ev) => estateIds.includes(ev.estateId) && isIssueTask(ev) && isIssueOpenStatus(ev.status)
      )
      .sort((a, b) => {
        const pa = a.priority ?? 'normal';
        const pb = b.priority ?? 'normal';
        const pd = PRIORITY_ORDER[pa] - PRIORITY_ORDER[pb];
        if (pd !== 0) return pd;
        if (a.date && b.date) return a.date < b.date ? -1 : 1;
        if (a.date) return -1;
        if (b.date) return 1;
        return (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt);
      })
      .slice(0, 3);
  }, [allMaintenanceEvents, estateIds]);

  const hasAttentionItems = heroIssues.length > 0;

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
    for (const ev of allMaintenanceEvents.filter((e) => estateIds.includes(e.estateId) && !isIssueTask(e))) {
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

  const dynamicSubtitle = useMemo(() => {
    if (heroIssues.length > 0) {
      const urgentCount = heroIssues.filter((ev) => ev.priority === 'urgent').length;
      if (urgentCount > 0)
        return `${urgentCount} urgent issue${urgentCount > 1 ? 's' : ''} need attention`;
      return `${heroIssues.length} thing${heroIssues.length > 1 ? 's' : ''} need${heroIssues.length === 1 ? 's' : ''} your attention`;
    }
    const arrivingToday = upcomingItems.find(
      (i) => i.kind === 'stay' && i.stay.from === todayStr
    );
    if (arrivingToday) return 'Guest arriving today';
    return 'Everything looks good today';
  }, [heroIssues, upcomingItems, todayStr]);

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={{ flex: 1 }}>
          <ThemedText type="title" style={styles.greeting}>
            Hello, {firstName}
          </ThemedText>
          <ThemedText type="caption" style={[styles.sub, { color: heroIssues.length > 0 ? colors.warning : colors.success }]}>
            {dynamicSubtitle}
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
          <View style={styles.attentionHeader}>
            <SectionHeader title={t('ownerHome.needsAttention')} />
          </View>
        )}

        {heroIssues.length > 0 && (
          <View style={styles.heroList}>
            {heroIssues.map((issue) => {
              const estateName = estateById[issue.estateId]?.name ?? '—';
              const pri = issue.priority ?? 'normal';
              const barColor = PRIORITY_BAR[pri];
              const isUrgent = issue.priority === 'urgent';
              const isHigh = issue.priority === 'high';
              return (
                <NextActionCard
                  key={issue.id}
                  issue={issue}
                  estateName={estateName}
                  barColor={barColor}
                  isUrgent={isUrgent}
                  isHigh={isHigh}
                  colors={colors}
                  onPress={() =>
                    router.push(
                      `/(app)/estates/${issue.estateId}/events/${issue.id}` as never
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
                <IconSymbol name="building.2.fill" size={15} color={colors.tint} />
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
              locked={!canInvite}
              feature="guests.invite"
              onPress={() => router.push('/(app)/guests' as never)}
              style={styles.overviewStatWrap}
            >
              <View style={styles.overviewStatContent}>
                <IconSymbol name="person.2.fill" size={15} color={colors.tint} />
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
              locked={false}
              showLock={!canApprove}
              feature="stays.approve"
              onPress={() => router.push('/(app)/stays' as never)}
              style={styles.overviewStatWrap}
            >
              <View style={styles.overviewStatContent}>
                <IconSymbol name="tray.fill" size={15} color={colors.tint} />
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
              onPress={() => router.push('/(app)/calendar' as never)}
              style={[styles.overviewStatWrap, styles.overviewStatContent]}
              activeOpacity={0.75}
            >
              <IconSymbol name="exclamationmark.triangle.fill" size={15} color={colors.tint} />
              <ThemedText type="statValue" style={[styles.overviewVal, { color: colors.tint }]}>
                {openIssuesCount}
              </ThemedText>
              <ThemedText style={[styles.overviewLabel, { color: colors.textSecondary }]}>
                {t('ownerHome.openIssues')}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </SurfaceCard>

        {/* ── Quick Actions ──────────────────────────────────────── */}
        <View style={styles.quickActionRow}>
          <HostProLockTouchable
            locked={false}
            onPress={() => router.push('/(app)/stays/block' as never)}
            style={styles.quickActionTouchable}
          >
            <View style={[styles.quickActionCard, { backgroundColor: colors.tint }]}>
              <View style={[styles.quickActionIconWrap, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <IconSymbol name="calendar.badge.plus" size={18} color="#fff" />
              </View>
              <ThemedText style={styles.quickActionTitle} numberOfLines={1}>
                {t('ownerHome.planStay')}
              </ThemedText>
              <ThemedText style={styles.quickActionSub} numberOfLines={2}>
                {t('ownerHome.planStaySub')}
              </ThemedText>
            </View>
          </HostProLockTouchable>

          <HostProLockTouchable
            locked={false}
            showLock={!canWriteEvents}
            feature="events.write"
            onPress={() => router.push('/(app)/maintenance' as never)}
            style={styles.quickActionTouchable}
          >
            <View style={[styles.quickActionCard, { backgroundColor: colors.tint }]}>
              <View style={[styles.quickActionIconWrap, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <IconSymbol name="wrench.fill" size={18} color="#fff" />
              </View>
              <ThemedText style={styles.quickActionTitle} numberOfLines={1}>
                {t('maintenanceOverview.screenTitle')}
              </ThemedText>
              <ThemedText style={styles.quickActionSub} numberOfLines={2}>
                {t('ownerHome.maintenanceQuickSub')}
              </ThemedText>
            </View>
          </HostProLockTouchable>
        </View>

        {/* ── Upcoming (unified) ─────────────────────────────────── */}
        <SectionHeader
          title={t('ownerHome.upcoming')}
          actionLabel={t('ownerHome.seeAll')}
          onAction={() => router.push('/(app)/calendar' as never)}
          actionHostLocked={false}
        />

        {estates.length === 0 ? (
          <EmptyState
            icon="building.2.fill"
            title={useCaseTip.tipTitle}
            subtitle={useCaseTip.tipBody}
            onAction={() => {
              if (canAddEstate) {
                router.push('/(app)/estates/new' as never);
                return;
              }
              if (isCoOwnerElsewhere) {
                openEstateCreatePaywall({ isCoOwnerElsewhere: true, returnTo: '/(app)/estates/new' });
                return;
              }
              router.push('/(app)/stays?tab=redeem' as never);
            }}
            actionLabel={
              canAddEstate
                ? t('estatesList.addEstate')
                : isCoOwnerElsewhere
                  ? t('access.upgradeCta', { defaultValue: 'Upgrade to Maison Pro' })
                  : t('estatesList.enterCode')
            }
          />
        ) : upcomingItems.length === 0 ? (
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
                    locked={false}
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
                        size={14}
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
                  locked={false}
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
                      size={14}
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
  issue: EstateEvent;
  estateName: string;
  barColor: string;
  isUrgent: boolean;
  isHigh: boolean;
  colors: ThemeColors;
  onPress: () => void;
}

function NextActionCard({
  issue,
  estateName,
  barColor,
  isUrgent,
  isHigh,
  colors,
  onPress,
}: NextActionCardProps) {
  const bgTint = isUrgent
    ? colors.error + '16'
    : isHigh
    ? colors.warning + '12'
    : colors.surface;
  const borderTint = isUrgent
    ? colors.error + '40'
    : isHigh
    ? colors.warning + '38'
    : colors.border;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.72}
      style={[
        styles.nextActionCard,
        {
          backgroundColor: bgTint,
          borderColor: borderTint,
        },
      ]}
    >
      <View style={[styles.nextActionBar, { backgroundColor: barColor }]} />
      <View style={styles.nextActionBody}>
        <View style={styles.nextActionTitleRow}>
          <ThemedText type="defaultSemiBold" numberOfLines={1} style={[styles.nextActionTitle, { flex: 1 }]}>
            {issue.title}
          </ThemedText>
          {isUrgent && (
            <View style={[styles.urgentChip, { backgroundColor: colors.error + '20', borderColor: colors.error + '50' }]}>
              <ThemedText style={[styles.urgentChipText, { color: colors.error }]}>URGENT</ThemedText>
            </View>
          )}
        </View>
        <ThemedText style={[styles.nextActionMeta, { color: colors.textSecondary }]} numberOfLines={1}>
          {estateName}
          {issue.date ? ` · Due ${formatDate(issue.date)}` : ''}
        </ThemedText>
      </View>
      <View style={styles.nextActionRight}>
        <StatusBadge status={issue.status ?? 'open'} />
        <View style={[styles.openBtn, { borderColor: colors.border }]}>
          <ThemedText style={[styles.openBtnText, { color: colors.tint }]}>Open</ThemedText>
          <IconSymbol name="chevron.right" size={11} color={colors.tint} />
        </View>
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

  // Hero / Needs Attention
  attentionHeader: { marginTop: 6 },
  heroList: { gap: 10, marginBottom: 14 },

  nextActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    minHeight: 70,
  },
  nextActionBar: { width: 7, alignSelf: 'stretch' },
  nextActionBody: { flex: 1, paddingVertical: 14, paddingHorizontal: 13, gap: 4 },
  nextActionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nextActionTitle: { fontSize: 15 },
  nextActionMeta: { fontSize: 12 },
  nextActionRight: { alignItems: 'flex-end', gap: 7, paddingRight: 14, paddingLeft: 4 },
  urgentChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  urgentChipText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  openBtnText: { fontSize: 12, fontWeight: '600' },

  // All clear
  allClear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Layout.sectionGap,
  },
  allClearText: { fontSize: 13, fontWeight: '500' },

  // Overview strip
  overviewCard: { marginBottom: Layout.sectionGap },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  /** Outer cell in overview row (HostProLockTouchable applies style to wrapper View). */
  overviewStatWrap: { flex: 1 },
  /** Shared column layout for icon + value + label (inside pressable). */
  overviewStatContent: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    width: '100%',
  },
  overviewDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    marginHorizontal: 2,
  },
  overviewVal: { fontSize: 19, fontWeight: '700', lineHeight: 23 },
  overviewLabel: {
    fontSize: 9,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
  },

  // Quick actions — equal width/height tiles
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    marginBottom: Layout.sectionGap,
  },
  quickActionTouchable: { flex: 1, alignSelf: 'stretch' },
  quickActionCard: {
    flex: 1,
    minHeight: 118,
    borderRadius: Radius.lg,
    paddingVertical: 13,
    paddingHorizontal: 12,
    gap: 6,
    justifyContent: 'flex-start',
  },
  quickActionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  quickActionSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.68)',
    lineHeight: 16,
    minHeight: 32,
  },

  // Upcoming
  upcomingList: { gap: 8, marginBottom: 8 },
  upcomingRowOuter: { marginBottom: 0 },
  upcomingRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingRight: 10,
    gap: 10,
  },
  upcomingTypeIcon: { marginLeft: 2, opacity: 0.65 },
  upcomingInfo: { flex: 1, gap: 2 },
  upcomingTitle: { fontSize: 14 },

  relBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    marginRight: 2,
  },
  relBadgeText: { fontSize: 11, fontWeight: '600' },
});
