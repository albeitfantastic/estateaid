import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { MonthGrid, DayInfo } from '@/components/calendar/month-grid';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useStayStore } from '@/store/stay-store';
import { finalizeCalendarAvailability } from '@/lib/calendar-availability-map';
import { formatDate, formatDateRange, getDaysInRange, toISODate, today } from '@/lib/date-utils';
import { getEventOccurrences } from '@/lib/event-utils';
import { guestEmailsMatch } from '@/lib/invite-email';
import { useEventStore } from '@/store/event-store';
import { useAvailabilityRuleStore } from '@/store/availability-rule-store';
import { calendarBlockingRangesFromRules, isDateBlockedByRules } from '@/lib/availability-rule-blocking';

export default function GuestCalendar() {
  const { t } = useTranslation();
  const monthNames = t('calendar.months', { returnObjects: true }) as string[];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allInvitations = useInvitationStore((s) => s.invitations);
  const allEstates = useEstateStore((s) => s.estates);
  const allStays = useStayStore((s) => s.stays);
  const allEvents = useEventStore((s) => s.events);
  const availabilityRules = useAvailabilityRuleStore((s) => s.rules);

  const acceptedEstates = useMemo(() => {
    const estateIds = allInvitations
      .filter(
        (inv) =>
          (guestEmailsMatch(inv.guestEmail, currentUser?.email) || inv.guestId === currentUser?.id) &&
          inv.status === 'accepted'
      )
      .map((inv) => inv.estateId);
    return allEstates.filter((e) => estateIds.includes(e.id));
  }, [allInvitations, allEstates, currentUser?.email, currentUser?.id]);

  const acceptedEstateIds = useMemo(() => acceptedEstates.map((e) => e.id), [acceptedEstates]);

  const [selectedEstateId, setSelectedEstateId] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  useEffect(() => {
    if (acceptedEstateIds.length === 0) return;
    if (!selectedEstateId || !acceptedEstateIds.includes(selectedEstateId)) {
      setSelectedEstateId(acceptedEstateIds[0]);
    }
  }, [acceptedEstateIds, selectedEstateId]);

  useEffect(() => {
    void useStayStore.getState().fetchFromSupabase();
  }, []);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  function pickEstate(id: string) { setSelectedEstateId(id); setSelectedDay(null); }
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

  const myStays = useMemo(
    () => allStays.filter((s) => s.estateId === selectedEstateId && s.guestId === currentUser?.id),
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
            { color: event.color ?? colors.tint, key: event.id },
          ],
        };
      });
    });
    finalizeCalendarAvailability(map, viewYear, viewMonth);
    return map;
  }, [estateStays, myStays, estateEvents, availabilityRules, selectedEstateId, viewYear, viewMonth, colors.tint]);

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
    return estateEvents.filter((event) =>
      getEventOccurrences(event, selectedDay, selectedDay).length > 0
    );
  }, [selectedDay, estateEvents]);

  const selectedEstate = acceptedEstates.find((e) => e.id === selectedEstateId);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
      </View>

      {acceptedEstates.length === 0 ? (
        <View style={styles.center}>
          <ThemedText style={{ opacity: 0.5 }}>{t('guestCalendar.emptyNoProperties')}</ThemedText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Estate picker */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.estateRow}
          >
            {acceptedEstates.map((estate) => {
              const active = selectedEstateId === estate.id;
              return (
                <TouchableOpacity
                  key={estate.id}
                  style={[
                    styles.estatePill,
                    { borderColor: colors.tint + '44' },
                    active && { backgroundColor: colors.tint, borderColor: colors.tint },
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

          {/* Month navigation */}
          <View style={styles.nav}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <IconSymbol name="arrow.left" size={18} color={colors.tint} />
            </TouchableOpacity>
            <ThemedText type="defaultSemiBold" style={styles.monthLabel}>
              {monthNames[viewMonth]} {viewYear}
            </ThemedText>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <IconSymbol name="arrow.right" size={18} color={colors.tint} />
            </TouchableOpacity>
          </View>

          {/* Day info card — between nav and grid */}
          {selectedDay && selectedDayData && (
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor:
                    selectedDayData.type === 'my-stay' ? '#22c55e12'
                    : selectedDayData.type === 'blocked' ? '#ef444410'
                    : selectedDayData.type === 'unavailable' ? '#64748b14'
                    : colors.tint + '0E',
                  borderColor:
                    selectedDayData.type === 'my-stay' ? '#22c55e44'
                    : selectedDayData.type === 'blocked' ? '#ef444430'
                    : selectedDayData.type === 'unavailable' ? '#64748b40'
                    : colors.tint + '33',
                },
              ]}
            >
              <View style={styles.infoCardInner}>
                <View
                  style={[
                    styles.infoDot,
                    {
                      backgroundColor:
                        selectedDayData.type === 'my-stay' ? '#22c55e'
                        : selectedDayData.type === 'blocked' ? '#ef4444'
                        : selectedDayData.type === 'unavailable' ? '#64748b'
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
                        {t('guestCalendar.yourStayLine', { name: selectedEstate?.name ?? '' })}
                      </ThemedText>
                      <ThemedText style={[styles.infoSub, { color: colors.icon }]}>
                        {formatDateRange(selectedDayData.stay.from, selectedDayData.stay.to)}
                      </ThemedText>
                    </>
                  )}
                  {selectedDayData.type === 'blocked' && (
                    <ThemedText style={[styles.infoMain, { color: '#ef4444' }]}>
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
                      {selectedDayEvents.map((event) => (
                        <View key={event.id} style={styles.eventRow}>
                          <View style={[styles.eventDot, { backgroundColor: event.color ?? colors.tint }]} />
                          <ThemedText style={[styles.eventTitle, { color: colors.text }]}>
                            {event.title}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedDay(null)} style={styles.infoDismiss}>
                <IconSymbol name="xmark" size={13} color={colors.icon} />
              </TouchableOpacity>
            </View>
          )}

          {/* Calendar grid */}
          <View style={[styles.calendarWrap, { backgroundColor: colors.background, borderColor: colors.icon + '22' }]}>
            <MonthGrid
              year={viewYear}
              month={viewMonth}
              dayInfoMap={dayInfoMap}
              selectedDay={selectedDay ?? undefined}
              onDayPress={(d) => setSelectedDay(d === selectedDay ? null : d)}
            />
          </View>

          {/* Collapsible legend */}
          <TouchableOpacity
            style={styles.legendToggle}
            onPress={() => setLegendOpen((o) => !o)}
            activeOpacity={0.7}
          >
            <ThemedText style={[styles.legendToggleLabel, { color: colors.icon }]}>
              {t('guestCalendar.legend')}
            </ThemedText>
            <IconSymbol name={legendOpen ? 'chevron.up' : 'chevron.down'} size={12} color={colors.icon} />
          </TouchableOpacity>

          {legendOpen && (
            <View style={[styles.legendBox, { backgroundColor: colors.background, borderColor: colors.icon + '22' }]}>
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
                  Available — open from today onward
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
                <View style={[styles.legendSwatchRing, { borderColor: colors.tint, borderWidth: 2.5 }]} />
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
  title: { fontSize: 32, fontWeight: '700' },
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

  legendToggle: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingVertical: 4, marginBottom: 6 },
  legendToggleLabel: { fontSize: 13, fontWeight: '600' },
  legendBox: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendSwatch: { width: 20, height: 20, borderRadius: 10 },
  legendSwatchRing: { width: 20, height: 20, borderRadius: 10 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 6 },
  legendLabel: { fontSize: 13 },
});
