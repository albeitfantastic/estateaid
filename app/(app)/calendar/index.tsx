import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { MonthGrid, DayInfo } from '@/components/calendar/month-grid';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/theme/useAppTheme';
import { finalizeCalendarAvailability } from '@/lib/calendar-availability-map';
import { formatDate, formatDateRange, getDaysInRange, toISODate, today } from '@/lib/date-utils';
import { getEventOccurrences } from '@/lib/event-utils';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useEventStore } from '@/store/event-store';
import { useStayStore } from '@/store/stay-store';
import { useAvailabilityRuleStore } from '@/store/availability-rule-store';
import { calendarBlockingRangesFromRules, isDateBlockedByRules } from '@/lib/availability-rule-blocking';
import { isIssueTask } from '@/lib/issue-task';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const ISSUE_DUE_DOT = '#f59e0b';

export default function CalendarScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const appTheme = useAppTheme();
  const colors = appTheme.colors;
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const allStays = useStayStore((s) => s.stays);
  const allEvents = useEventStore((s) => s.events);
  const availabilityRules = useAvailabilityRuleStore((s) => s.rules);

  const myEstates = useMemo(
    () => allEstates.filter((e) => e.ownerId === (currentUser?.id ?? '')),
    [allEstates, currentUser?.id]
  );

  const estateIds = useMemo(() => myEstates.map((e) => e.id), [myEstates]);

  const [selectedEstateId, setSelectedEstateId] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  useEffect(() => {
    if (estateIds.length === 0) return;
    if (!selectedEstateId || !estateIds.includes(selectedEstateId)) {
      setSelectedEstateId(estateIds[0]);
    }
  }, [estateIds, selectedEstateId]);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

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
      allStays.filter(
        (s) => s.estateId === selectedEstateId && s.guestId === currentUser?.id
      ),
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
            { color: event.color ?? colors.primary, key: event.id },
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
    colors.primary,
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

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        
      </View>

      {myEstates.length === 0 ? (
        <View style={styles.center}>
          <ThemedText style={{ opacity: 0.5 }}>
            No properties yet. Add a property to see the calendar.
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
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
                    { borderColor: colors.primary + '44' },
                    active && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => pickEstate(estate.id)}
                  activeOpacity={0.8}
                >
                  <ThemedText style={[styles.estatePillText, { color: active ? '#fff' : colors.text }]}>
                    {estate.name}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.nav}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <IconSymbol name="arrow.left" size={18} color={colors.primary} />
            </TouchableOpacity>
            <ThemedText type="defaultSemiBold" style={styles.monthLabel}>
              {MONTHS[viewMonth]} {viewYear}
            </ThemedText>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <IconSymbol name="arrow.right" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {selectedDay && selectedDayData && (
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor:
                    selectedDayData.type === 'my-stay'
                      ? '#22c55e12'
                      : selectedDayData.type === 'blocked'
                        ? '#ef444410'
                        : selectedDayData.type === 'unavailable'
                          ? '#64748b14'
                          : colors.primarySoft,
                  borderColor:
                    selectedDayData.type === 'my-stay'
                      ? '#22c55e44'
                      : selectedDayData.type === 'blocked'
                        ? '#ef444430'
                        : selectedDayData.type === 'unavailable'
                          ? '#64748b40'
                          : colors.primary + '33',
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
                          ? '#22c55e'
                          : selectedDayData.type === 'blocked'
                            ? '#ef4444'
                            : selectedDayData.type === 'unavailable'
                              ? '#64748b'
                              : '#22c55e',
                    },
                  ]}
                />
                <View style={styles.infoText}>
                  <ThemedText type="defaultSemiBold" style={styles.infoDate}>
                    {formatDate(selectedDay)}
                  </ThemedText>
                  {selectedDayData.type === 'my-stay' && (
                    <>
                      <ThemedText style={[styles.infoMain, { color: '#22c55e' }]}>
                        Your stay · {selectedEstate?.name}
                      </ThemedText>
                      <ThemedText style={[styles.infoSub, { color: colors.icon }]}>
                        {formatDateRange(selectedDayData.stay.from, selectedDayData.stay.to)}
                      </ThemedText>
                    </>
                  )}
                  {selectedDayData.type === 'blocked' && (
                    <ThemedText style={[styles.infoMain, { color: '#ef4444' }]}>
                      Not available — property occupied
                    </ThemedText>
                  )}
                  {selectedDayData.type === 'unavailable' && (
                    <ThemedText style={[styles.infoMain, { color: colors.icon }]}>
                      Unavailable — this date has passed
                    </ThemedText>
                  )}
                  {selectedDayData.type === 'available' && (
                    <ThemedText style={[styles.infoMain, { color: colors.icon }]}>
                      Available — no bookings on this date
                    </ThemedText>
                  )}
                  {selectedDayEvents.length > 0 && (
                    <View style={styles.eventList}>
                      {selectedDayEvents.map((event) => {
                        const dotColor =
                          isIssueTask(event) && (event.status === 'open' || event.status === 'in_progress')
                            ? ISSUE_DUE_DOT
                            : event.color ?? colors.primary;
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
              <TouchableOpacity onPress={() => setSelectedDay(null)} style={styles.infoDismiss}>
                <IconSymbol name="xmark" size={13} color={colors.icon} />
              </TouchableOpacity>
            </View>
          )}

          <View
            style={[
              styles.calendarWrap,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
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
            <ThemedText style={[styles.legendToggleLabel, { color: colors.textMuted }]}>
              {t('guestCalendar.legend')}
            </ThemedText>
            <IconSymbol name={legendOpen ? 'chevron.up' : 'chevron.down'} size={12} color={colors.icon} />
          </TouchableOpacity>

          {legendOpen && (
            <View
              style={[
                styles.legendBox,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <View style={styles.legendRow}>
                <View style={[styles.legendSwatch, { backgroundColor: '#22c55e' }]} />
                <ThemedText style={[styles.legendLabel, { color: colors.text }]}>
                  {t('guestCalendar.legendYourStay')}
                </ThemedText>
              </View>
              <View style={styles.legendRow}>
                <View
                  style={[
                    styles.legendSwatch,
                    {
                      backgroundColor: '#16a34a14',
                      borderWidth: 1,
                      borderColor: '#16a34a44',
                    },
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
                    {
                      backgroundColor: '#64748b18',
                      borderWidth: 1,
                      borderColor: '#64748b55',
                    },
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
                    {
                      backgroundColor: '#ef444438',
                      borderWidth: 1,
                      borderColor: '#dc262688',
                    },
                  ]}
                />
                <ThemedText style={[styles.legendLabel, { color: colors.text }]}>
                  {t('guestCalendar.legendUnavailableBooked')}
                </ThemedText>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendSwatchRing, { borderColor: '#0a7ea4', borderWidth: 1.5 }]} />
                <ThemedText style={[styles.legendLabel, { color: colors.text }]}>
                  {t('guestCalendar.legendToday')}
                </ThemedText>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendSwatchRing, { borderColor: colors.primary, borderWidth: 2.5 }]} />
                <ThemedText style={[styles.legendLabel, { color: colors.text }]}>
                  {t('guestCalendar.legendSelectedDay')}
                </ThemedText>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                <ThemedText style={[styles.legendLabel, { color: colors.text }]}>
                  {t('guestCalendar.legendPropertyEvent')}
                </ThemedText>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: ISSUE_DUE_DOT }]} />
                <ThemedText style={[styles.legendLabel, { color: colors.text }]}>
                  {t('ticketsHub.legendIssueDue')}
                </ThemedText>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  back: { padding: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  scroll: { paddingHorizontal: 20 },

  estateRow: { gap: 8, paddingVertical: 4, marginBottom: 16 },
  estatePill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  estatePillText: { fontSize: 13, fontWeight: '600' },

  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  navBtn: { padding: 8 },
  monthLabel: { fontSize: 18 },

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

  calendarWrap: { padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 14 },

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
