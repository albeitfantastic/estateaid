import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/badge';
import { SectionHeader } from '@/components/ui/section-header';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDate } from '@/lib/date-utils';
import { describeRecurrence } from '@/lib/event-utils';
import { isIssueTask } from '@/lib/issue-task';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useEventStore } from '@/store/event-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';

const PRIORITY_COLORS: Record<string, string> = {
  low: '#94a3b8',
  normal: '#0a7ea4',
  high: '#f59e0b',
  urgent: '#ef4444',
};

type AddFlow = 'maintenance' | 'issue' | null;

export default function GlobalMaintenanceScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const getEstateById = useEstateStore((s) => s.getEstateById);
  const events = useEventStore((s) => s.events);
  const profileById = useProfileStore((s) => s.byId);

  const [addFlow, setAddFlow] = useState<AddFlow>(null);

  const myEstates = useMemo(
    () => allEstates.filter((e) => e.ownerId === (currentUser?.id ?? '')),
    [allEstates, currentUser?.id]
  );

  const estateNameById = useMemo(() => {
    const m: Record<string, string> = {};
    myEstates.forEach((e) => {
      m[e.id] = e.name;
    });
    return m;
  }, [myEstates]);

  const myEstateIds = useMemo(() => new Set(myEstates.map((e) => e.id)), [myEstates]);

  const myEvents = useMemo(
    () => events.filter((e) => myEstateIds.has(e.estateId)),
    [events, myEstateIds]
  );

  const recurring = useMemo(() => myEvents.filter((e) => e.type === 'recurring'), [myEvents]);
  const calendarTasks = useMemo(
    () => myEvents.filter((e) => e.type === 'task' && !isIssueTask(e)),
    [myEvents]
  );
  const issueTasks = useMemo(() => myEvents.filter((e) => isIssueTask(e)), [myEvents]);

  function openEstatePicker(flow: Exclude<AddFlow, null>) {
    if (myEstates.length === 0) return;
    setAddFlow(flow);
  }

  function onPickEstate(estateId: string) {
    const flow = addFlow;
    setAddFlow(null);
    if (!flow) return;
    if (flow === 'issue') {
      router.push(`/(app)/estates/${estateId}/events/new?kind=issue` as never);
    } else {
      router.push(`/(app)/estates/${estateId}/events/new` as never);
    }
  }

  const canAdd = myEstates.length > 0;

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <ThemedText type="title" style={styles.title}>
          {t('maintenanceOverview.screenTitle')}
        </ThemedText>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.tint + '22', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.tint + '55' }]}
            onPress={() => (canAdd ? openEstatePicker('issue') : undefined)}
            disabled={!canAdd}
            activeOpacity={0.8}
            accessibilityLabel={t('maintenanceOverview.addIssue')}
          >
            <IconSymbol name="exclamationmark.triangle.fill" size={18} color={colors.tint} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.tint, opacity: canAdd ? 1 : 0.45 }]}
            onPress={() => (canAdd ? openEstatePicker('maintenance') : undefined)}
            disabled={!canAdd}
            activeOpacity={0.8}
            accessibilityLabel={t('maintenanceOverview.addMaintenance')}
          >
            <IconSymbol name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {!canAdd ? (
        <EmptyState
          icon="building.2.fill"
          title={t('maintenanceOverview.emptyNoEstatesTitle')}
          subtitle={t('maintenanceOverview.emptyNoEstatesSub')}
          actionLabel={t('tabs.properties')}
          onAction={() => router.push('/(app)/estates' as never)}
        />
      ) : myEvents.length === 0 ? (
        <EmptyState
          icon="calendar.badge.plus"
          title={t('maintenanceOverview.emptyEventsTitle')}
          subtitle={t('maintenanceOverview.emptyEventsSub')}
          actionLabel={t('maintenanceSchedule.addCta')}
          onAction={() => openEstatePicker('maintenance')}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}>
          {recurring.length > 0 && (
            <>
              <SectionHeader title={t('maintenanceSchedule.recurringSection', { count: recurring.length })} />
              {recurring.map((ev) => {
                const estateName = estateNameById[ev.estateId] ?? t('common.unknownEstate');
                return (
                  <TouchableOpacity
                    key={ev.id}
                    style={[styles.row, { borderColor: colors.icon + '22', backgroundColor: colors.surface }]}
                    onPress={() => router.push(`/(app)/estates/${ev.estateId}/events/${ev.id}` as never)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.colorBar, { backgroundColor: ev.color ?? colors.tint }]} />
                    <View style={styles.rowInfo}>
                      <ThemedText type="defaultSemiBold" style={styles.rowTitle} numberOfLines={1}>
                        {ev.title}
                      </ThemedText>
                      <ThemedText style={[styles.rowSub, { color: colors.icon }]} numberOfLines={1}>
                        {estateName}
                      </ThemedText>
                      <ThemedText style={[styles.rowDesc, { color: colors.icon }]} numberOfLines={2}>
                        {describeRecurrence(ev)}
                      </ThemedText>
                    </View>
                    <IconSymbol name="chevron.right" size={16} color={colors.icon} />
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {calendarTasks.length > 0 && (
            <>
              <SectionHeader title={t('maintenanceSchedule.calendarTasksSection', { count: calendarTasks.length })} />
              {calendarTasks.map((ev) => {
                const estateName = estateNameById[ev.estateId] ?? t('common.unknownEstate');
                return (
                  <TouchableOpacity
                    key={ev.id}
                    style={[styles.row, { borderColor: colors.icon + '22', backgroundColor: colors.surface }]}
                    onPress={() => router.push(`/(app)/estates/${ev.estateId}/events/${ev.id}` as never)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.colorBar, { backgroundColor: ev.color ?? colors.tint }]} />
                    <View style={styles.rowInfo}>
                      <ThemedText type="defaultSemiBold" style={styles.rowTitle} numberOfLines={1}>
                        {ev.title}
                      </ThemedText>
                      <ThemedText style={[styles.rowSub, { color: colors.icon }]} numberOfLines={1}>
                        {estateName} · {ev.date ?? t('maintenanceSchedule.noDate')}
                      </ThemedText>
                      {ev.description ? (
                        <ThemedText style={[styles.rowDesc, { color: colors.icon }]} numberOfLines={1}>
                          {ev.description}
                        </ThemedText>
                      ) : null}
                    </View>
                    <IconSymbol name="chevron.right" size={16} color={colors.icon} />
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {issueTasks.length > 0 && (
            <>
              <SectionHeader title={t('maintenanceSchedule.issueTasksSection', { count: issueTasks.length })} />
              {issueTasks.map((ev) => {
                const estateName = estateNameById[ev.estateId] ?? t('common.unknownEstate');
                const guestName = ev.guestId ? resolveUserDisplayName(ev.guestId, profileById) : '—';
                const pri = ev.priority ?? 'normal';
                return (
                  <TouchableOpacity
                    key={ev.id}
                    style={[styles.row, { borderColor: colors.icon + '22', backgroundColor: colors.surface }]}
                    onPress={() => router.push(`/(app)/estates/${ev.estateId}/events/${ev.id}` as never)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.colorBar, { backgroundColor: PRIORITY_COLORS[pri] ?? colors.tint }]} />
                    <View style={styles.rowInfo}>
                      <ThemedText type="defaultSemiBold" style={styles.rowTitle} numberOfLines={1}>
                        {ev.title}
                      </ThemedText>
                      <ThemedText style={[styles.rowSub, { color: colors.icon }]} numberOfLines={1}>
                        {estateName} · {guestName}
                        {ev.date ? ` · ${formatDate(ev.date)}` : ''}
                      </ThemedText>
                      <ThemedText style={[styles.rowDesc, { color: colors.icon }]}>
                        {(ev.messages ?? []).length}{' '}
                        {(ev.messages ?? []).length === 1
                          ? t('maintenanceSchedule.messageSingular')
                          : t('maintenanceSchedule.messagePlural')}
                      </ThemedText>
                    </View>
                    <View style={styles.issueRight}>
                      {ev.status ? <StatusBadge status={ev.status} /> : null}
                      <IconSymbol name="chevron.right" size={16} color={colors.icon} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </ScrollView>
      )}

      <Modal visible={addFlow !== null} animationType="slide" transparent onRequestClose={() => setAddFlow(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAddFlow(null)}>
          <View
            style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.icon + '33' }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.icon + '22' }]}>
              <ThemedText type="defaultSemiBold" style={{ fontSize: 17 }}>
                {t('maintenanceOverview.pickPropertyTitle')}
              </ThemedText>
              <TouchableOpacity onPress={() => setAddFlow(null)} hitSlop={12}>
                <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>{t('common.close')}</ThemedText>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {myEstates.map((e) => (
                <TouchableOpacity
                  key={e.id}
                  style={[styles.modalRow, { borderBottomColor: colors.icon + '11' }]}
                  onPress={() => onPickEstate(e.id)}
                >
                  <ThemedText type="defaultSemiBold" numberOfLines={1}>
                    {e.name}
                  </ThemedText>
                  {e.location ? (
                    <ThemedText style={{ color: colors.icon, fontSize: 13 }} numberOfLines={1}>
                      {e.location}
                    </ThemedText>
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  title: { flex: 1, fontSize: 28, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 10,
    gap: 12,
    paddingRight: 14,
  },
  colorBar: { width: 4, alignSelf: 'stretch' },
  rowInfo: { flex: 1, paddingVertical: 12, gap: 2 },
  rowTitle: { fontSize: 14 },
  rowSub: { fontSize: 12 },
  rowDesc: { fontSize: 11, marginTop: 2 },
  issueRight: { alignItems: 'flex-end', gap: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '55%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalScroll: { maxHeight: 360 },
  modalRow: { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
});
