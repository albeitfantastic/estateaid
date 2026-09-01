import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { DayInfo, MonthGrid } from '@/components/calendar/month-grid';
import {
  StayRequestsList,
  useIncomingStayRequests,
  useOutgoingStayRequests,
} from '@/components/stays/stay-requests-list';
import { StaysList, useManagedStays, useMyStays } from '@/components/stays/stays-list';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { BootstrapErrorBanner } from '@/components/ui/bootstrap-error-banner';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  FilledButton,
  OutlineButton,
  ScreenScroll,
  ScreenShell,
  SectionLabel,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { CalendarColors, Layout } from '@/constants/theme';
import { calendarBlockingRangesFromRules, isDateBlockedByRules } from '@/lib/availability-rule-blocking';
import { finalizeCalendarAvailability } from '@/lib/calendar-availability-map';
import { formatDate, formatDateRange, getDaysInRange, toISODate, today } from '@/lib/date-utils';
import { getEventOccurrences } from '@/lib/event-utils';
import { isIssueTask } from '@/lib/issue-task';
import { acceptedInvitedEstateIds } from '@/lib/accepted-invited-estates';
import { useManagedEstates } from '@/lib/entitlements/capabilities';
import { useAuthStore } from '@/store/auth-store';
import { useAvailabilityRuleStore } from '@/store/availability-rule-store';
import { useEstateStore } from '@/store/estate-store';
import { useEventStore } from '@/store/event-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useStayStore } from '@/store/stay-store';

type CalendarSegment = 'month' | 'stays' | 'requests';

function paramString(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return '';
}

function parseSegment(raw: string): CalendarSegment | null {
  const lower = raw.toLowerCase();
  if (lower === 'month' || lower === 'stays' || lower === 'requests') return lower;
  // Old Stays-tab aliases (`?tab=upcoming`) land on the Stays segment.
  if (lower === 'upcoming') return 'stays';
  return null;
}

/**
 * The single time surface (spec §12 / plan Phase 2): Month answers "when can this
 * place be used", Stays lists confirmed bookings and Requests is the inbox. All three
 * segments exist for both roles; only their sections differ, so a host who is also a
 * guest elsewhere sees both without a `guestMode` fork.
 */
export default function CalendarScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{
    segment?: string | string[];
    /** @deprecated Old Stays-tab query. Same three segments for every role; `view` is ignored. */
    tab?: string | string[];
    view?: string | string[];
    estateId?: string | string[];
  }>();
  const paramSegment =
    parseSegment(paramString(params.segment)) ?? parseSegment(paramString(params.tab));
  const paramEstateId = paramString(params.estateId);
  const { colors, scheme } = useScreenTheme();
  const cal = CalendarColors[scheme];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const allStays = useStayStore((s) => s.stays);
  const allEvents = useEventStore((s) => s.events);
  const availabilityRules = useAvailabilityRuleStore((s) => s.rules);
  const allInvitations = useInvitationStore((s) => s.invitations);

  const { estates: managedEstates, isManaged } = useManagedEstates();

  const invitedEstateIds = useMemo(
    () => acceptedInvitedEstateIds(allInvitations, currentUser?.id, currentUser?.email),
    [allInvitations, currentUser?.id, currentUser?.email]
  );

  const myEstates = useMemo(() => {
    const invited = allEstates.filter((e) => !isManaged(e.id) && invitedEstateIds.includes(e.id));
    return [...managedEstates, ...invited];
  }, [allEstates, managedEstates, isManaged, invitedEstateIds]);

  const estateIds = useMemo(() => myEstates.map((e) => e.id), [myEstates]);

  /** A deep link may scope every segment to one property (e.g. from the property hub). */
  const scopedEstateId = paramEstateId && estateIds.includes(paramEstateId) ? paramEstateId : undefined;

  const [segment, setSegment] = useState<CalendarSegment>(paramSegment ?? 'month');
  const [selectedEstateId, setSelectedEstateId] = useState<string>(scopedEstateId ?? '');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  useEffect(() => {
    if (paramSegment) setSegment(paramSegment);
  }, [paramSegment]);

  useEffect(() => {
    if (estateIds.length === 0) return;
    const preferred = scopedEstateId ?? selectedEstateId;
    if (!preferred || !estateIds.includes(preferred)) {
      setSelectedEstateId(scopedEstateId ?? estateIds[0]);
    } else if (preferred !== selectedEstateId) {
      setSelectedEstateId(preferred);
    }
  }, [estateIds, selectedEstateId, scopedEstateId]);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  // ── Segment data ────────────────────────────────────────────────────────────
  const incomingRequests = useIncomingStayRequests(scopedEstateId);
  const outgoingRequests = useOutgoingStayRequests(scopedEstateId);
  const managedStays = useManagedStays(scopedEstateId);
  const myUpcomingStays = useMyStays(scopedEstateId);

  const managesAny = managedEstates.length > 0;
  const guestsAnywhere = invitedEstateIds.length > 0;
  const pendingOutgoing = outgoingRequests.filter((r) => r.status === 'pending').length;
  const requestBadge = incomingRequests.length + pendingOutgoing;

  const blockDatesHref = scopedEstateId
    ? `/(app)/stays/block?estateId=${scopedEstateId}`
    : '/(app)/stays/block';
  const requestDatesHref = scopedEstateId
    ? `/(app)/stays/plan?estateId=${scopedEstateId}`
    : '/(app)/stays/plan';

  // ── Month segment data ──────────────────────────────────────────────────────
  function pickEstate(id: string) {
    setSelectedEstateId(id);
    setSelectedDay(null);
  }
  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
    setSelectedDay(null);
  }

  const myStays = useMemo(
    () =>
      allStays.filter((s) => s.estateId === selectedEstateId && s.guestId === currentUser?.id),
    [allStays, selectedEstateId, currentUser?.id]
  );

  const estateStays = useMemo(
    () => allStays.filter((s) => s.estateId === selectedEstateId),
    [allStays, selectedEstateId]
  );

  const estateEvents = useMemo(
    () => allEvents.filter((e) => e.estateId === selectedEstateId),
    [allEvents, selectedEstateId]
  );

  const dayInfoMap = useMemo(() => {
    const map: Record<string, DayInfo> = {};
    estateStays.forEach(({ from, to }) => {
      if (!from || !to) return;
      getDaysInRange(from, to).forEach((dateStr) => {
        map[dateStr] = { dateStr, availability: 'blocked' };
      });
    });
    myStays.forEach(({ from, to }) => {
      if (!from || !to) return;
      getDaysInRange(from, to).forEach((dateStr) => {
        map[dateStr] = { dateStr, availability: 'my-stay' };
      });
    });
    calendarBlockingRangesFromRules(availabilityRules, selectedEstateId).forEach(({ from, to }) => {
      getDaysInRange(from, to).forEach((dateStr) => {
        const existing = map[dateStr];
        if (existing?.availability === 'my-stay') return;
        map[dateStr] = { ...(existing ?? { dateStr }), dateStr, availability: 'blocked' };
      });
    });
    const firstDay = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;
    const lastDay = toISODate(new Date(viewYear, viewMonth + 1, 0));
    estateEvents.forEach((event) => {
      getEventOccurrences(event, firstDay, lastDay).forEach((dateStr) => {
        const existing = map[dateStr] ?? { dateStr };
        map[dateStr] = {
          ...existing,
          dots: [
            ...(existing.dots ?? []),
            {
              color:
                isIssueTask(event) && (event.status === 'open' || event.status === 'in_progress')
                  ? cal.issue
                  : event.color ?? colors.tint,
              key: event.id,
            },
          ],
        };
      });
    });
    finalizeCalendarAvailability(map, viewYear, viewMonth);
    return map;
  }, [
    estateStays,
    myStays,
    estateEvents,
    availabilityRules,
    selectedEstateId,
    viewYear,
    viewMonth,
    colors.tint,
    cal.issue,
  ]);

  const selectedDayData = useMemo(() => {
    if (!selectedDay) return null;
    const mine = myStays.find((s) => selectedDay >= s.from && selectedDay <= s.to);
    if (mine) return { type: 'my-stay' as const, stay: mine };
    const isBlocked =
      estateStays.some((s) => s.from && s.to && selectedDay >= s.from && selectedDay <= s.to) ||
      isDateBlockedByRules(availabilityRules, selectedEstateId, selectedDay);
    if (isBlocked) return { type: 'blocked' as const };
    if (selectedDay < today()) return { type: 'unavailable' as const };
    return { type: 'available' as const };
  }, [selectedDay, myStays, estateStays, availabilityRules, selectedEstateId]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return estateEvents.filter(
      (event) => getEventOccurrences(event, selectedDay, selectedDay).length > 0
    );
  }, [selectedDay, estateEvents]);

  const selectedEstate = myEstates.find((e) => e.id === selectedEstateId);
  const canGoBack = navigation.canGoBack();

  if (myEstates.length === 0) {
    return (
      <ScreenShell title={t('tabs.calendar')} showBack={canGoBack}>
        <BootstrapErrorBanner />
        <EmptyState
          icon="building.2.fill"
          title={t('estatesList.emptyTitle')}
          subtitle={t('guestCalendar.emptyNoProperties')}
          actionLabel={t('tabs.properties')}
          onAction={() => router.push('/(app)/estates' as never)}
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={t('tabs.calendar')} showBack={canGoBack}>
      <BootstrapErrorBanner />
      <SegmentedControl<CalendarSegment>
        segments={[
          { key: 'month', label: t('calendarTab.segmentMonth') },
          { key: 'stays', label: t('calendarTab.segmentStays') },
          { key: 'requests', label: t('calendarTab.segmentRequests'), badge: requestBadge },
        ]}
        value={segment}
        onChange={(next) => setSegment(next)}
      />

      {segment === 'month' && (
        <ScreenScroll gap={0}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.estateRow}
          >
            {myEstates.map((estate) => {
              const active = selectedEstateId === estate.id;
              return (
                <TouchableOpacity
                  key={estate.id}
                  style={[
                    styles.estatePill,
                    active && { borderBottomColor: colors.text },
                  ]}
                  onPress={() => pickEstate(estate.id)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={estate.name}
                >
                  <ThemedText
                    style={[
                      styles.estatePillText,
                      { color: active ? colors.text : colors.textSecondary },
                      active && styles.estatePillTextActive,
                    ]}
                  >
                    {estate.name}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.nav}>
            <TouchableOpacity
              onPress={prevMonth}
              style={styles.navBtn}
              accessibilityLabel={t('calendarTab.previousMonth')}
            >
              <IconSymbol name="arrow.left" size={18} color={colors.tint} />
            </TouchableOpacity>
            <ThemedText type="defaultSemiBold" style={styles.monthLabel}>
              {(t('calendar.months', { returnObjects: true }) as string[])[viewMonth]} {viewYear}
            </ThemedText>
            <TouchableOpacity
              onPress={nextMonth}
              style={styles.navBtn}
              accessibilityLabel={t('calendarTab.nextMonth')}
            >
              <IconSymbol name="arrow.right" size={18} color={colors.tint} />
            </TouchableOpacity>
          </View>

          {selectedDay && selectedDayData && (
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor:
                    selectedDayData.type === 'my-stay'
                      ? cal.availableFill
                      : selectedDayData.type === 'blocked'
                        ? cal.bookedFill
                        : selectedDayData.type === 'unavailable'
                          ? colors.textSecondary + '14'
                          : cal.availableFill,
                  borderColor:
                    selectedDayData.type === 'my-stay'
                      ? cal.availableBorder
                      : selectedDayData.type === 'blocked'
                        ? cal.bookedBorder
                        : selectedDayData.type === 'unavailable'
                          ? colors.textSecondary + '40'
                          : cal.availableBorder,
                },
              ]}
            >
              <View style={styles.infoCardInner}>
                <View
                  style={[
                    styles.infoDot,
                    {
                      backgroundColor:
                        selectedDayData.type === 'my-stay'
                          ? cal.myStay
                          : selectedDayData.type === 'blocked'
                            ? cal.booked
                            : selectedDayData.type === 'unavailable'
                              ? colors.textSecondary
                              : cal.available,
                    },
                  ]}
                />
                <View style={styles.infoText}>
                  <ThemedText type="defaultSemiBold" style={styles.infoDate}>
                    {formatDate(selectedDay)}
                  </ThemedText>
                  {selectedDayData.type === 'my-stay' && (
                    <>
                      <ThemedText style={[styles.infoMain, { color: cal.myStay }]}>
                        {t('guestCalendar.yourStayLine', { name: selectedEstate?.name ?? '' })}
                      </ThemedText>
                      <ThemedText style={[styles.infoSub, { color: colors.icon }]}>
                        {formatDateRange(selectedDayData.stay.from, selectedDayData.stay.to)}
                      </ThemedText>
                    </>
                  )}
                  {selectedDayData.type === 'blocked' && (
                    <ThemedText style={[styles.infoMain, { color: cal.booked }]}>
                      {t('guestCalendar.blockedOccupied')}
                    </ThemedText>
                  )}
                  {selectedDayData.type === 'unavailable' && (
                    <ThemedText style={[styles.infoMain, { color: colors.icon }]}>
                      {t('guestCalendar.unavailablePast')}
                    </ThemedText>
                  )}
                  {selectedDayData.type === 'available' && (
                    <ThemedText style={[styles.infoMain, { color: colors.icon }]}>
                      {t('guestCalendar.availableNoBookings')}
                    </ThemedText>
                  )}
                  {selectedDayEvents.length > 0 && (
                    <View style={styles.eventList}>
                      {selectedDayEvents.map((event) => {
                        const dotColor =
                          isIssueTask(event) &&
                          (event.status === 'open' || event.status === 'in_progress')
                            ? cal.issue
                            : event.color ?? colors.tint;
                        const content = (
                          <>
                            <View style={[styles.eventDot, { backgroundColor: dotColor }]} />
                            <ThemedText
                              style={[styles.eventTitle, { color: colors.text, flex: 1 }]}
                              numberOfLines={1}
                            >
                              {event.title}
                              {isIssueTask(event) ? ` · ${event.status ?? ''}` : ''}
                            </ThemedText>
                            {isIssueTask(event) ? (
                              <IconSymbol name="chevron.right" size={12} color={colors.icon} />
                            ) : null}
                          </>
                        );
                        return isIssueTask(event) ? (
                          <TouchableOpacity
                            key={event.id}
                            style={styles.eventRow}
                            onPress={() =>
                              router.push(
                                `/(app)/estates/${event.estateId}/events/${event.id}` as never
                              )
                            }
                            activeOpacity={0.7}
                          >
                            {content}
                          </TouchableOpacity>
                        ) : (
                          <View key={event.id} style={styles.eventRow}>
                            {content}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedDay(null)}
                style={styles.infoDismiss}
                accessibilityLabel={t('common.close')}
              >
                <IconSymbol name="xmark" size={13} color={colors.icon} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.calendarWrap}>
            <MonthGrid
              year={viewYear}
              month={viewMonth}
              dayInfoMap={dayInfoMap}
              selectedDay={selectedDay ?? undefined}
              onDayPress={(d) => setSelectedDay(d === selectedDay ? null : d)}
            />
          </View>

          <TouchableOpacity
            style={styles.legendToggle}
            onPress={() => setLegendOpen((o) => !o)}
            activeOpacity={0.7}
          >
            <ThemedText style={[styles.legendToggleLabel, { color: colors.textSecondary }]}>
              {t('guestCalendar.legend')}
            </ThemedText>
            <IconSymbol
              name={legendOpen ? 'chevron.up' : 'chevron.down'}
              size={12}
              color={colors.icon}
            />
          </TouchableOpacity>

          {legendOpen && (
            <View
              style={[
                styles.legendBox,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <View style={styles.legendRow}>
                <View style={[styles.legendSwatch, { backgroundColor: cal.myStay }]} />
                <ThemedText style={[styles.legendLabel, { color: colors.text }]}>
                  {t('guestCalendar.legendYourStay')}
                </ThemedText>
              </View>
              <View style={styles.legendRow}>
                <View
                  style={[
                    styles.legendSwatch,
                    { backgroundColor: cal.availableFill, borderWidth: 1, borderColor: cal.availableBorder },
                  ]}
                />
                <ThemedText style={[styles.legendLabel, { color: colors.text }]}>
                  {t('guestCalendar.legendAvailableFuture')}
                </ThemedText>
              </View>
              <View style={styles.legendRow}>
                <View
                  style={[
                    styles.legendSwatch,
                    { backgroundColor: colors.textSecondary + '18', borderWidth: 1, borderColor: colors.textSecondary + '55' },
                  ]}
                />
                <ThemedText style={[styles.legendLabel, { color: colors.text }]}>
                  {t('guestCalendar.legendUnavailablePast')}
                </ThemedText>
              </View>
              <View style={styles.legendRow}>
                <View
                  style={[
                    styles.legendSwatch,
                    { backgroundColor: cal.bookedFill, borderWidth: 1, borderColor: cal.bookedBorder },
                  ]}
                />
                <ThemedText style={[styles.legendLabel, { color: colors.text }]}>
                  {t('guestCalendar.legendUnavailableBooked')}
                </ThemedText>
              </View>
              <View style={styles.legendRow}>
                <View
                  style={[styles.legendSwatchRing, { borderColor: colors.tint, borderWidth: 1.5 }]}
                />
                <ThemedText style={[styles.legendLabel, { color: colors.text }]}>
                  {t('guestCalendar.legendToday')}
                </ThemedText>
              </View>
              <View style={styles.legendRow}>
                <View
                  style={[styles.legendSwatchRing, { borderColor: colors.tint, borderWidth: 2.5 }]}
                />
                <ThemedText style={[styles.legendLabel, { color: colors.text }]}>
                  {t('guestCalendar.legendSelectedDay')}
                </ThemedText>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: colors.tint }]} />
                <ThemedText style={[styles.legendLabel, { color: colors.text }]}>
                  {t('guestCalendar.legendPropertyEvent')}
                </ThemedText>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: cal.issue }]} />
                <ThemedText style={[styles.legendLabel, { color: colors.text }]}>
                  {t('ticketsHub.legendIssueDue')}
                </ThemedText>
              </View>
            </View>
          )}
        </ScreenScroll>
      )}

      {segment === 'stays' &&
        (managedStays.length === 0 && myUpcomingStays.length === 0 ? (
          <EmptyState
            icon="calendar"
            title={t('calendarTab.staysEmptyTitle')}
            subtitle={
              managesAny ? t('calendarTab.staysEmptyHostSub') : t('calendarTab.staysEmptyGuestSub')
            }
            actionLabel={managesAny ? t('titles.blockDates') : t('titles.requestDates')}
            onAction={() =>
              router.push((managesAny ? blockDatesHref : requestDatesHref) as never)
            }
          />
        ) : (
          <ScreenScroll gap={0}>
            {managesAny && (
              <>
                <SectionLabel>{t('calendarTab.staysManagedSection')}</SectionLabel>
                <StaysList mode="managed" estateId={scopedEstateId} hideWhenEmpty />
                <FilledButton
                  label={t('titles.blockDates')}
                  icon="plus"
                  onPress={() => router.push(blockDatesHref as never)}
                />
              </>
            )}

            {(guestsAnywhere || myUpcomingStays.length > 0) && (
              <>
                <SectionLabel marginTop={managesAny ? 20 : 0}>
                  {t('calendarTab.staysMineSection')}
                </SectionLabel>
                <StaysList mode="mine" estateId={scopedEstateId} hideWhenEmpty />
                {guestsAnywhere && (
                  <OutlineButton
                    label={t('titles.requestDates')}
                    icon="plus"
                    onPress={() => router.push(requestDatesHref as never)}
                  />
                )}
              </>
            )}
          </ScreenScroll>
        ))}

      {segment === 'requests' &&
        (incomingRequests.length === 0 && outgoingRequests.length === 0 ? (
          <EmptyState
            icon="tray.fill"
            title={t('calendarTab.requestsEmptyTitle')}
            subtitle={
              managesAny
                ? t('calendarTab.requestsEmptyHostSub')
                : t('calendarTab.requestsEmptyGuestSub')
            }
            actionLabel={guestsAnywhere ? t('titles.requestDates') : undefined}
            onAction={
              guestsAnywhere ? () => router.push(requestDatesHref as never) : undefined
            }
          />
        ) : (
          <ScreenScroll gap={0}>
            {managesAny && incomingRequests.length > 0 && (
              <>
                <SectionLabel>{t('calendarTab.requestsIncomingSection')}</SectionLabel>
                <StayRequestsList mode="incoming" estateId={scopedEstateId} hideWhenEmpty />
              </>
            )}

            {outgoingRequests.length > 0 && (
              <>
                <SectionLabel
                  marginTop={managesAny && incomingRequests.length > 0 ? 20 : 0}
                >
                  {t('calendarTab.requestsOutgoingSection')}
                </SectionLabel>
                <StayRequestsList mode="outgoing" estateId={scopedEstateId} hideWhenEmpty />
              </>
            )}
          </ScreenScroll>
        ))}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  estateRow: { gap: 16, paddingVertical: 4, marginBottom: 12 },
  estatePill: {
    paddingHorizontal: 2,
    paddingVertical: 8,
    minHeight: Layout.touchMin,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  estatePillText: { fontSize: 15, fontWeight: '500' },
  estatePillTextActive: { fontWeight: '700' },

  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  navBtn: { padding: 8, minWidth: Layout.touchMin, minHeight: Layout.touchMin, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { letterSpacing: -0.6, fontSize: 22, lineHeight: 28 },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  infoCardInner: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  infoText: { flex: 1, gap: 3 },
  infoDate: { fontSize: 13 },
  infoMain: { fontSize: 13, fontWeight: '600' },
  infoSub: { fontSize: 12 },
  infoDismiss: { padding: 4 },
  eventList: { gap: 4, marginTop: 4 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventDot: { width: 7, height: 7, borderRadius: 3.5 },
  eventTitle: { fontSize: 12, fontWeight: '500' },

  calendarWrap: { paddingVertical: 8, marginBottom: 14 },

  legendToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    marginBottom: 6,
  },
  legendToggleLabel: { fontSize: 13, fontWeight: '600' },
  legendBox: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendSwatch: { width: 20, height: 20, borderRadius: 10 },
  legendSwatchRing: { width: 20, height: 20, borderRadius: 10 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 6 },
  legendLabel: { fontSize: 13 },
});
