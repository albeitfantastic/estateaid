import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { SettingsSheet, type SettingsDestination } from '@/components/settings/settings-sheet';
import { ConversionCard } from '@/components/home/conversion-card';
import { GuestHomeBody } from '@/components/home/guest-home';
import { StayHeroPager, type StayHeroPage } from '@/components/home/stay-hero-pager';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { OverAllocationChooser } from '@/components/ui/over-allocation-chooser';
import {
  FilledButton,
  GroupedList,
  GroupedRow,
  ScreenScroll,
  ScreenShell,
  SectionHeader,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { SetupChecklist } from '@/components/ui/setup-checklist';
import { TrialStatusLine } from '@/components/ui/trial-status-line';
import { BootstrapErrorBanner } from '@/components/ui/bootstrap-error-banner';
import { EstateColors, Layout, Radius } from '@/constants/theme';
import { trialDaysRemaining } from '@/lib/access-tier-core';
import { useAccountContext, useCan, useManagedEstates } from '@/lib/entitlements/capabilities';
import { openEstateCreatePaywall, openUpgradePaywall } from '@/lib/maison-pro-upgrade';
import { openEstateHub } from '@/lib/open-estate-hub';
import { homeEmphasisFor, type OnboardingUseCase } from '@/lib/onboarding-starters';
import { fetchProfileUseCase } from '@/lib/use-case-profile';
import { setPushMasterEnabled } from '@/lib/notifications';
import {
  daysBlockedFromStays,
  fetchInviteConversionSeen,
  hostHasAcceptedInvite,
  inventoryIsEmpty,
  isDay11Window,
  markInviteConversionSeen,
  pickConversionKind,
  type ConversionInventory,
  type ConversionKind,
} from '@/lib/conversion-moments';
import { addDays, formatDate, formatDateRange, today } from '@/lib/date-utils';
import { debugLog1393f3 } from '@/lib/debug-session-1393f3';
import { getEventOccurrences } from '@/lib/event-utils';
import {
  busiestPropertyNights,
  emptyEstateNamesThisWeekend,
  heaviestGuestNights,
  weekOccupancy,
  yearSpendTotal,
} from '@/lib/home-host-briefing';
import { navigateToSettingsSection } from '@/lib/settings-navigation';
import { useAuthStore } from '@/store/auth-store';
import { useContactStore } from '@/store/contact-store';
import { useDocumentStore } from '@/store/document-store';
import { useEstateCoverageStore } from '@/store/estate-coverage-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useGuestProfileStore } from '@/store/guest-profile-store';
import { useProfileStore } from '@/store/profile-store';
import { useEventStore } from '@/store/event-store';
import { useExpenseStore } from '@/store/expense-store';
import { useStayStore } from '@/store/stay-store';
import { isIssueOpenStatus, isIssueTask } from '@/lib/issue-task';
import { resolveStayOccupantName, stayIsSelf } from '@/lib/stay-occupant';
import type { Estate, EstateEvent, IssuePriority, Stay } from '@/types';

const MAINTENANCE_HOME_HORIZON_DAYS = 120;
const UPCOMING_PREVIEW_LIMIT = 5;

const PRIORITY_ORDER: Record<IssuePriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
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
  const { colors } = useScreenTheme();

  const getStayRelativeLabel = useCallback(
    (from: string, to: string, todayStr: string): string => {
      if (from === todayStr) return t('stayRelative.arrivingToday');
      if (to === todayStr) return t('stayRelative.departingToday');
      if (from <= todayStr && to >= todayStr) return t('stayRelative.activeStay');
      const diffMs = new Date(from).getTime() - new Date(todayStr).getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) return t('stayRelative.tomorrow');
      return t('stayRelative.inDays', { count: diffDays });
    },
    [t]
  );

  const currentUser = useAuthStore((s) => s.currentUser);
  const {
    themePreference,
    setThemePreference,
    signOut,
    notificationsEnabled,
  } = useAuthStore();
  const isDark = themePreference === 'dark';
  const [menuOpen, setMenuOpen] = useState(false);
  const [stayHeroIndex, setStayHeroIndex] = useState(0);

  const allStayRequests = useStayStore((s) => s.stayRequests);
  const allStays = useStayStore((s) => s.stays);
  const allMaintenanceEvents = useEventStore((s) => s.events);
  const allInvitations = useInvitationStore((s) => s.invitations);
  const todayStr = today();
  const profileById = useProfileStore((s) => s.byId);
  const guestProfiles = useGuestProfileStore((s) => s.profiles);
  const account = useAccountContext();
  const can = useCan();
  const { estates, estateIds, roleById } = useManagedEstates();
  const allEstates = useEstateStore((s) => s.estates);
  const coverageById = useEstateCoverageStore((s) => s.byId);
  const allDocuments = useDocumentStore((s) => s.documents);
  const allContacts = useContactStore((s) => s.contacts);
  const allExpenses = useExpenseStore((s) => s.expenses);

  const canAddEstate = can('property.create');
  const isCoOwnerElsewhere = useMemo(
    () => Object.values(roleById).some((role) => role === 'owner'),
    [roleById]
  );
  const [useCase, setUseCase] = useState<OnboardingUseCase | null>(null);
  const [inviteSeen, setInviteSeen] = useState(true);
  const [conversionKind, setConversionKind] = useState<ConversionKind | 'checklist' | null>(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    void fetchProfileUseCase(currentUser.id).then(setUseCase);
    void fetchInviteConversionSeen(currentUser.id).then(setInviteSeen);
  }, [currentUser?.id]);

  const useCaseTip = homeEmphasisFor(useCase);

  const estateColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    estates.forEach((e, i) => {
      map[e.id] = EstateColors[i % EstateColors.length];
    });
    return map;
  }, [estates]);

  const estateById = useMemo(
    () => Object.fromEntries(allEstates.map((e) => [e.id, e] as const)),
    [allEstates]
  );

  const guestEstates = useMemo(
    () => allEstates.filter((e) => roleById[e.id] === 'guest'),
    [allEstates, roleById]
  );
  const isGuestOnly = estateIds.length === 0 && guestEstates.length > 0;
  const accessibleEstates = useMemo(() => {
    const seen = new Set(estates.map((e) => e.id));
    return [...estates, ...guestEstates.filter((e) => !seen.has(e.id))];
  }, [estates, guestEstates]);
  const accessibleEstateIds = useMemo(
    () => accessibleEstates.map((e) => e.id),
    [accessibleEstates]
  );

  const pendingCount = useMemo(
    () =>
      allStayRequests.filter((r) => estateIds.includes(r.estateId) && r.status === 'pending')
        .length,
    [allStayRequests, estateIds]
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

  const weekStats = useMemo(
    () => weekOccupancy(allStays, estateIds, todayStr),
    [allStays, estateIds, todayStr]
  );

  const emptyWeekendNames = useMemo(() => {
    const namesById: Record<string, string> = {};
    for (const e of estates) namesById[e.id] = e.name;
    return emptyEstateNamesThisWeekend(estateIds, namesById, allStays, todayStr);
  }, [estates, estateIds, allStays, todayStr]);

  const attentionIssues = useMemo(() => {
    return allMaintenanceEvents
      .filter((ev) => {
        if (!estateIds.includes(ev.estateId) || !isIssueTask(ev) || !isIssueOpenStatus(ev.status)) {
          return false;
        }
        const pri = ev.priority ?? 'normal';
        const hot = pri === 'urgent' || pri === 'high';
        const due = ev.date != null && ev.date <= todayStr;
        return hot || due;
      })
      .sort((a, b) => {
        const pd = PRIORITY_ORDER[a.priority ?? 'normal'] - PRIORITY_ORDER[b.priority ?? 'normal'];
        if (pd !== 0) return pd;
        if (a.date && b.date) return a.date.localeCompare(b.date);
        if (a.date) return -1;
        if (b.date) return 1;
        return (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt);
      })
      .slice(0, 5);
  }, [allMaintenanceEvents, estateIds, todayStr]);

  const year = Number(todayStr.slice(0, 4));
  const yearBusiest = useMemo(
    () => busiestPropertyNights(allStays, estateIds, year),
    [allStays, estateIds, year]
  );
  const yearGuest = useMemo(
    () => heaviestGuestNights(allStays, estateIds, year, currentUser?.id),
    [allStays, estateIds, year, currentUser?.id]
  );
  const yearSpend = useMemo(
    () => yearSpendTotal(allExpenses, estateIds, year),
    [allExpenses, estateIds, year]
  );
  const yearGuestName = useMemo(() => {
    if (!yearGuest) return null;
    return resolveStayOccupantName(
      {
        id: '',
        stayRequestId: '',
        estateId: '',
        from: todayStr,
        to: todayStr,
        guestCount: 1,
        guestId: yearGuest.guestId,
        guestProfileId: yearGuest.guestProfileId,
      },
      { profilesById: profileById, guestProfiles }
    );
  }, [yearGuest, profileById, guestProfiles, todayStr]);

  // Unified upcoming: merge stays + maintenance sorted by date
  const upcomingStayItems = useMemo((): Extract<UpcomingItem, { kind: 'stay' }>[] => {
    return allStays
      .filter((s) => accessibleEstateIds.includes(s.estateId) && s.to >= todayStr)
      .sort((a, b) => {
        const aActive = a.from <= todayStr && a.to >= todayStr;
        const bActive = b.from <= todayStr && b.to >= todayStr;
        if (aActive !== bActive) return aActive ? -1 : 1;
        return a.from.localeCompare(b.from);
      })
      .map((s) => {
        const estate = estateById[s.estateId];
        const isOwnerStay = stayIsSelf(s, currentUser?.id);
        const guestLabel = isOwnerStay
          ? (currentUser?.name?.split(' ')[0] ?? t('common.you'))
          : resolveStayOccupantName(s, { profilesById: profileById, guestProfiles });
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
  }, [
    allStays,
    accessibleEstateIds,
    estateById,
    estateColorMap,
    todayStr,
    currentUser?.id,
    currentUser?.name,
    profileById,
    guestProfiles,
    colors.tint,
    getStayRelativeLabel,
    t,
  ]);

  const upcomingItems = useMemo((): UpcomingItem[] => {
    const horizon = addDays(todayStr, MAINTENANCE_HOME_HORIZON_DAYS);

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

    return [...upcomingStayItems, ...maintItems]
      .sort((a, b) => a.sortDate.localeCompare(b.sortDate))
      .slice(0, UPCOMING_PREVIEW_LIMIT);
  }, [
    upcomingStayItems,
    allMaintenanceEvents,
    estateIds,
    estateById,
    estateColorMap,
    todayStr,
    colors.tint,
    t,
  ]);

  const inventory: ConversionInventory = useMemo(
    () => ({
      documents: allDocuments.filter((d) => estateIds.includes(d.estateId)).length,
      contacts: allContacts.filter((c) => estateIds.includes(c.estateId)).length,
      guests: guestsCount,
      daysBlocked: daysBlockedFromStays(allStays, estateIds),
    }),
    [allDocuments, allContacts, estateIds, guestsCount, allStays]
  );

  const coverageLapsed = useMemo(() => {
    return estates.some((e) => {
      const cov = coverageById[e.id];
      return cov && !cov.covered && cov.actorRole === 'sponsor';
    });
  }, [estates, coverageById]);

  const trialDays = trialDaysRemaining(account.trialEndsAt);
  const pitchEstateName = estates[0]?.name ?? guestEstates[0]?.name ?? 'Maison';

  useEffect(() => {
    if (!currentUser) return;
    const kind = pickConversionKind({
      guestOnly: isGuestOnly,
      coverageLapsed,
      inviteAcceptedOnce: hostHasAcceptedInvite(allInvitations, currentUser.id),
      inviteSeen,
      day11: isDay11Window(trialDays),
      inventoryEmpty: inventoryIsEmpty(inventory),
    });
    setConversionKind(kind);
  }, [
    currentUser,
    isGuestOnly,
    coverageLapsed,
    allInvitations,
    inviteSeen,
    trialDays,
    inventory,
  ]);

  const propertyHeroes = useMemo(() => {
    const nextStayByEstate = new Map<string, Extract<UpcomingItem, { kind: 'stay' }>>();
    for (const item of upcomingStayItems) {
      if (!nextStayByEstate.has(item.stay.estateId)) {
        nextStayByEstate.set(item.stay.estateId, item);
      }
    }
    return [...accessibleEstates]
      .sort((a, b) => {
        const sa = nextStayByEstate.get(a.id);
        const sb = nextStayByEstate.get(b.id);
        const aRank = sa?.isActive ? 0 : sa ? 1 : 2;
        const bRank = sb?.isActive ? 0 : sb ? 1 : 2;
        if (aRank !== bRank) return aRank - bRank;
        if (sa && sb) return sa.sortDate.localeCompare(sb.sortDate);
        return a.name.localeCompare(b.name);
      })
      .map((estate) => ({
        estate,
        nextStay: nextStayByEstate.get(estate.id),
      }));
  }, [accessibleEstates, upcomingStayItems]);

  const usePropertyPager = propertyHeroes.length > 0;
  const visibleHero =
    propertyHeroes[Math.min(stayHeroIndex, Math.max(propertyHeroes.length - 1, 0))];
  const visibleStay = visibleHero?.nextStay;
  const heroEstate = visibleHero?.estate ?? estates[0];
  const pagedStayIds = useMemo(() => {
    const ids = new Set<string>();
    for (const h of propertyHeroes) {
      if (h.nextStay) ids.add(h.nextStay.stay.id);
    }
    return ids;
  }, [propertyHeroes]);
  const upcomingRest = upcomingItems.filter(
    (item) => !(item.kind === 'stay' && pagedStayIds.has(item.stay.id))
  );

  const stayHeroPages = useMemo((): StayHeroPage[] => {
    return propertyHeroes.map((h) => {
      const stay = h.nextStay;
      return {
        id: h.estate.id,
        imageUrl: h.estate.coverImageUrl,
        accessibilityLabel: h.estate.name,
        eyebrow: t('ownerHome.nextStay'),
        title: h.estate.name,
        subtitle: stay
          ? `${stay.guestLabel} · ${formatDateRange(stay.stay.from, stay.stay.to)}`
          : t('ownerHome.noStayOnProperty'),
        onPress: () => {
          openEstateHub(h.estate.id, { fromHome: true });
        },
      };
    });
  }, [propertyHeroes, router, t]);

  // #region agent log
  useEffect(() => {
    const roles: Record<string, string> = {};
    for (const [id, role] of Object.entries(roleById)) roles[id.slice(0, 8)] = role;
    const pageIds = stayHeroPages.map((p) => p.id);
    debugLog1393f3({
      hypothesisId: 'A,D,E',
      location: 'app/(app)/home/index.tsx:stayHero',
      message: 'home hero inputs',
      runId: 'post-fix',
      data: {
        isGuestOnly,
        allEstates: allEstates.length,
        managed: estates.length,
        guest: guestEstates.length,
        accessible: accessibleEstates.length,
        pageCount: stayHeroPages.length,
        uniquePageIds: new Set(pageIds).size,
        roles,
      },
    });
  }, [
    isGuestOnly,
    allEstates.length,
    estates.length,
    guestEstates.length,
    accessibleEstates.length,
    stayHeroPages,
    roleById,
  ]);
  // #endregion

  const visibleHeroIsGuest = heroEstate ? roleById[heroEstate.id] === 'guest' : false;

  function onHeroPress() {
    if (visibleStay) {
      router.push(`/(app)/stays/${visibleStay.stay.id}` as never);
      return;
    }
    if (heroEstate) {
      if (visibleHeroIsGuest) {
        router.push(`/(app)/stays/plan?estateId=${heroEstate.id}` as never);
        return;
      }
      router.push(`/(app)/stays/block?estateId=${heroEstate.id}` as never);
      return;
    }
    router.push('/(app)/stays/block' as never);
  }

  return (
    <ScreenShell
      showBack={false}
      title={
        !isGuestOnly ? (
          <View style={styles.headerStatus}>
            <TrialStatusLine />
          </View>
        ) : undefined
      }
      headerRight={
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
          accessibilityRole="button"
          accessibilityLabel={t('ownerHome.settingsMenu')}
        >
          <IconSymbol name="gearshape.fill" size={22} color={colors.tint} />
        </TouchableOpacity>
      }
    >
      <SettingsSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        colors={colors}
        insets={insets}
        currentUser={
          currentUser ? { name: currentUser.name, email: currentUser.email } : null
        }
        slotCount={account.slotCount}
        propertiesSponsored={account.propertiesSponsored}
        isDark={isDark}
        notificationsOn={notificationsEnabled}
        onToggleDark={(v: boolean) => setThemePreference(v ? 'dark' : 'light')}
        onToggleNotifications={(v: boolean) => {
          if (currentUser) void setPushMasterEnabled(currentUser.id, v);
        }}
        onNavigate={(dest: SettingsDestination) => navigateToSettingsSection(router, dest)}
        onSignOut={() => {
          void signOut().then(() => router.replace('/(auth)' as never));
        }}
      />

      <BootstrapErrorBanner />

      {isGuestOnly ? (
        <GuestHomeBody
          estates={guestEstates}
          stays={allStays}
          userId={currentUser?.id ?? ''}
        />
      ) : (
      <ScreenScroll
        gap={0}
        contentContainerStyle={styles.scroll}
      >
        <OverAllocationChooser />

        {usePropertyPager ? (
          <View style={styles.heroBlock}>
            <StayHeroPager pages={stayHeroPages} onIndexChange={setStayHeroIndex} />
            <FilledButton
              tone="accent"
              size="hero"
              label={
                visibleStay
                  ? t('ownerHome.viewStay')
                  : visibleHeroIsGuest
                    ? t('guestLanding.requestDates')
                    : t('estateHub.addStay')
              }
              onPress={onHeroPress}
            />
          </View>
        ) : null}

        <View style={[styles.statBand, { borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => router.push('/(app)/calendar?segment=stays' as never)}
            style={styles.statCell}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${weekStats.inHouse} ${t('ownerHome.inHouse')}`}
          >
            <ThemedText type="statValue" style={styles.statValue}>
              {weekStats.inHouse}
            </ThemedText>
            <ThemedText type="statLabel" style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t('ownerHome.inHouse')}
            </ThemedText>
          </TouchableOpacity>
          <View style={[styles.statRule, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            onPress={() => router.push('/(app)/calendar?segment=stays' as never)}
            style={styles.statCell}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${weekStats.arriving} ${t('ownerHome.arrivingShort')}`}
          >
            <ThemedText type="statValue" style={styles.statValue}>
              {weekStats.arriving}
            </ThemedText>
            <ThemedText type="statLabel" style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t('ownerHome.arrivingShort')}
            </ThemedText>
          </TouchableOpacity>
          <View style={[styles.statRule, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            onPress={() => router.push('/(app)/calendar?segment=stays' as never)}
            style={styles.statCell}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${weekStats.departing} ${t('ownerHome.departingShort')}`}
          >
            <ThemedText type="statValue" style={styles.statValue}>
              {weekStats.departing}
            </ThemedText>
            <ThemedText type="statLabel" style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t('ownerHome.departingShort')}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {emptyWeekendNames.length > 0 ? (
          <TouchableOpacity
            onPress={() => router.push('/(app)/estates' as never)}
            style={styles.emptyWeekend}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <ThemedText style={[styles.emptyWeekendText, { color: colors.textSecondary }]}>
              {emptyWeekendNames.length === 1
                ? t('ownerHome.emptyWeekendOne', { name: emptyWeekendNames[0] })
                : t('ownerHome.emptyWeekendMany', { count: emptyWeekendNames.length })}
            </ThemedText>
          </TouchableOpacity>
        ) : null}

        {(pendingCount > 0 || attentionIssues.length > 0) ? (
          <View style={styles.section}>
            <SectionHeader title={t('ownerHome.needsAttention')} />
            <GroupedList>
              {pendingCount > 0 ? (
                <GroupedRow
                  icon="tray.fill"
                  title={t('ownerHome.pending', { count: pendingCount })}
                  subtitle={t('ownerHome.requestsInbox')}
                  onPress={() => router.push('/(app)/calendar?segment=requests' as never)}
                  isLast={attentionIssues.length === 0}
                />
              ) : null}
              {attentionIssues.map((issue, i) => (
                <GroupedRow
                  key={issue.id}
                  icon="exclamationmark.triangle.fill"
                  title={issue.title}
                  subtitle={estateById[issue.estateId]?.name}
                  onPress={() =>
                    router.push(`/(app)/estates/${issue.estateId}/events/${issue.id}` as never)
                  }
                  isLast={i === attentionIssues.length - 1}
                />
              ))}
            </GroupedList>
          </View>
        ) : null}

        {conversionKind && conversionKind !== 'checklist' ? (
          <View style={styles.section}>
            <ConversionCard
              kind={conversionKind}
              inventory={inventory}
              propertyName={pitchEstateName}
              onChoosePlan={() => openUpgradePaywall('coverage_lapse', '/(app)/home')}
              onDismiss={
                conversionKind === 'invite_accepted' && currentUser
                  ? () => {
                      void markInviteConversionSeen(currentUser.id);
                      setInviteSeen(true);
                    }
                  : undefined
              }
            />
          </View>
        ) : conversionKind === 'checklist' && estates[0] ? (
          <View style={styles.section}>
            <SetupChecklist estateId={estates[0].id} quiet />
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader
            title={t('ownerHome.upcoming')}
            actionLabel={t('ownerHome.seeAll')}
            onAction={() => router.push('/(app)/calendar' as never)}
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
                router.push('/(app)/estates/join' as never);
              }}
              actionLabel={
                canAddEstate
                  ? t('estatesList.addEstate')
                  : isCoOwnerElsewhere
                    ? t('access.upgradeCta', { defaultValue: 'Upgrade to Maison Pro' })
                    : t('estatesList.enterCode')
              }
            />
          ) : upcomingRest.length === 0 ? (
            usePropertyPager ? null : (
            <EmptyState
              icon="calendar"
              title={t('ownerHome.noUpcomingTitle')}
              actionLabel={t('ownerHome.browseCalendar')}
              onAction={() => router.push('/(app)/calendar' as never)}
            />
            )
          ) : (
            <GroupedList>
              {upcomingRest.map((item, i) => {
                const isLast = i === upcomingRest.length - 1;
                if (item.kind === 'stay') {
                  const isActive = item.isActive;
                  const relColor = isActive ? colors.success : colors.tint;
                  return (
                    <GroupedRow
                      key={item.stay.id}
                      icon="person.fill"
                      iconColor={item.dotColor}
                      title={item.guestLabel}
                      subtitle={`${item.estate?.name} · ${formatDateRange(item.stay.from, item.stay.to)}`}
                      onPress={() => router.push('/(app)/calendar?segment=stays' as never)}
                      isLast={isLast}
                      trailing={
                        <View style={[styles.relBadge, { backgroundColor: relColor + '18' }]}>
                          <ThemedText style={[styles.relBadgeText, { color: relColor }]}>
                            {item.relLabel}
                          </ThemedText>
                        </View>
                      }
                    />
                  );
                }
                return (
                  <GroupedRow
                    key={`${item.event.id}-${item.nextDate}`}
                    icon="wrench.fill"
                    iconColor={item.dotColor}
                    title={item.event.title}
                    subtitle={`${item.estate?.name ?? '—'} · ${formatDate(item.nextDate)} · ${item.typeLabel}`}
                    onPress={() =>
                      router.push(
                        `/(app)/estates/${item.event.estateId}/events/${item.event.id}` as never
                      )
                    }
                    isLast={isLast}
                    trailing={
                      <View style={[styles.relBadge, { backgroundColor: colors.tint + '18' }]}>
                        <ThemedText style={[styles.relBadgeText, { color: colors.tint }]}>
                          {item.relLabel}
                        </ThemedText>
                      </View>
                    }
                  />
                );
              })}
            </GroupedList>
          )}
        </View>

        {(yearBusiest || yearGuest || yearSpend > 0) ? (
          <View style={styles.section}>
            <SectionHeader title={t('ownerHome.thisYear')} />
            <GroupedList>
              {yearBusiest ? (
                <GroupedRow
                  icon="building.2.fill"
                  title={t('ownerHome.busiestProperty')}
                  subtitle={`${estateById[yearBusiest.estateId]?.name ?? ''} · ${t('ownerHome.nightsCount', { count: yearBusiest.nights })}`}
                  onPress={() => openEstateHub(yearBusiest.estateId, { fromHome: true })}
                  isLast={!yearGuest && yearSpend <= 0}
                />
              ) : null}
              {yearGuest && yearGuestName ? (
                <GroupedRow
                  icon="person.fill"
                  title={t('ownerHome.heaviestGuest')}
                  subtitle={`${yearGuestName} · ${t('ownerHome.nightsCount', { count: yearGuest.nights })}`}
                  onPress={() => router.push('/(app)/guests' as never)}
                  isLast={yearSpend <= 0}
                />
              ) : null}
              {yearSpend > 0 ? (
                <GroupedRow
                  icon="tag.fill"
                  title={t('ownerHome.yearSpend')}
                  subtitle={yearSpend.toFixed(2)}
                  onPress={() => {
                    if (estates.length === 1) {
                      router.push(`/(app)/estates/${estates[0].id}/expenses` as never);
                      return;
                    }
                    router.push('/(app)/estates' as never);
                  }}
                  isLast
                />
              ) : null}
            </GroupedList>
          </View>
        ) : null}
      </ScreenScroll>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  menuBtn: {
    width: Layout.touchMin,
    height: Layout.touchMin,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerStatus: {
    flex: 1,
    justifyContent: 'center',
    minHeight: Layout.touchMin,
  },
  scroll: { paddingTop: 12, paddingBottom: Layout.sectionGap + 24 },

  heroBlock: { gap: 16, marginTop: 4, marginBottom: 8 },

  statBand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 8,
    paddingVertical: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Layout.touchMin,
    gap: 6,
  },
  statRule: { width: StyleSheet.hairlineWidth, height: 36 },
  statValue: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  statLabel: { textAlign: 'center' },

  emptyWeekend: {
    paddingVertical: 8,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  emptyWeekendText: { fontSize: 14, lineHeight: 20 },

  section: { marginTop: 28 },

  relBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  relBadgeText: { fontSize: 12, fontWeight: '600' },
});
