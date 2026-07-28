import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
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
import { useEventStore } from '@/store/event-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';

const PRIORITY_COLORS: Record<string, string> = {
  low: '#94a3b8',
  normal: '#0a7ea4',
  high: '#f59e0b',
  urgent: '#ef4444',
};

function paramId(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return '';
}

export default function EventsIndex() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ estateId: string | string[] }>();
  const estateId = paramId(params.estateId);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { events, deleteEvent } = useEventStore();
  const profileById = useProfileStore((s) => s.byId);

  const estateEvents = useMemo(
    () => events.filter((e) => e.estateId === estateId),
    [events, estateId]
  );
  const recurring = estateEvents.filter((e) => e.type === 'recurring');
  const tasks = estateEvents.filter((e) => e.type === 'task');
  const calendarTasks = tasks.filter((e) => !isIssueTask(e));
  const issueTasks = tasks.filter((e) => isIssueTask(e));

  function confirmDelete(id: string, title: string) {
    Alert.alert(t('maintenanceSchedule.deleteTitle'), t('maintenanceSchedule.deleteMessage', { title }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('editEstateScreen.deleteConfirmCta'), style: 'destructive', onPress: () => void deleteEvent(id) },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>{t('titles.events')}</ThemedText>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.tint + '22', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.tint + '55' }]}
            onPress={() =>
              router.push(`/(app)/estates/${estateId}/events/new?kind=issue` as never)
            }
            activeOpacity={0.8}
            accessibilityLabel={t('maintenanceSchedule.addIssueCta')}
          >
            <IconSymbol name="exclamationmark.triangle.fill" size={18} color={colors.tint} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.tint }]}
            onPress={() => router.push(`/(app)/estates/${estateId}/events/new` as never)}
            activeOpacity={0.8}
          >
            <IconSymbol name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {estateEvents.length === 0 ? (
        <EmptyState
          icon="calendar.badge.plus"
          title={t('maintenanceSchedule.emptyTitle')}
          subtitle={t('maintenanceSchedule.emptySub')}
          actionLabel={t('maintenanceSchedule.addCta')}
          onAction={() => router.push(`/(app)/estates/${estateId}/events/new` as never)}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}>
          {recurring.length > 0 && (
            <>
              <SectionHeader title={t('maintenanceSchedule.recurringSection', { count: recurring.length })} />
              {recurring.map((ev) => (
                <TouchableOpacity
                  key={ev.id}
                  style={[styles.row, { borderColor: colors.icon + '22', backgroundColor: colors.surface }]}
                  onPress={() => router.push(`/(app)/estates/${estateId}/events/${ev.id}` as never)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.colorBar, { backgroundColor: ev.color ?? colors.tint }]} />
                  <View style={styles.rowInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.rowTitle}>{ev.title}</ThemedText>
                    <ThemedText style={[styles.rowSub, { color: colors.icon }]}>
                      {describeRecurrence(ev)}
                    </ThemedText>
                    {ev.description ? (
                      <ThemedText style={[styles.rowDesc, { color: colors.icon }]} numberOfLines={1}>
                        {ev.description}
                      </ThemedText>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => confirmDelete(ev.id, ev.title)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <IconSymbol name="trash" size={16} color={colors.error} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </>
          )}

          {calendarTasks.length > 0 && (
            <>
              <SectionHeader title={t('maintenanceSchedule.calendarTasksSection', { count: calendarTasks.length })} />
              {calendarTasks.map((ev) => (
                <TouchableOpacity
                  key={ev.id}
                  style={[styles.row, { borderColor: colors.icon + '22', backgroundColor: colors.surface }]}
                  onPress={() => router.push(`/(app)/estates/${estateId}/events/${ev.id}` as never)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.colorBar, { backgroundColor: ev.color ?? colors.tint }]} />
                  <View style={styles.rowInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.rowTitle}>{ev.title}</ThemedText>
                    <ThemedText style={[styles.rowSub, { color: colors.icon }]}>
                      {ev.date ?? t('maintenanceSchedule.noDate')}
                    </ThemedText>
                    {ev.description ? (
                      <ThemedText style={[styles.rowDesc, { color: colors.icon }]} numberOfLines={1}>
                        {ev.description}
                      </ThemedText>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => confirmDelete(ev.id, ev.title)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <IconSymbol name="trash" size={16} color={colors.error} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </>
          )}

          {issueTasks.length > 0 && (
            <>
              <SectionHeader title={t('maintenanceSchedule.issueTasksSection', { count: issueTasks.length })} />
              {issueTasks.map((ev) => {
                const guestName = ev.guestId
                  ? resolveUserDisplayName(ev.guestId, profileById)
                  : '—';
                const pri = ev.priority ?? 'normal';
                return (
                  <TouchableOpacity
                    key={ev.id}
                    style={[styles.row, { borderColor: colors.icon + '22', backgroundColor: colors.surface }]}
                    onPress={() => router.push(`/(app)/estates/${estateId}/events/${ev.id}` as never)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.colorBar, { backgroundColor: PRIORITY_COLORS[pri] ?? colors.tint }]} />
                    <View style={styles.rowInfo}>
                      <ThemedText type="defaultSemiBold" style={styles.rowTitle} numberOfLines={1}>
                        {ev.title}
                      </ThemedText>
                      <ThemedText style={[styles.rowSub, { color: colors.icon }]} numberOfLines={1}>
                        {guestName}
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  back: { padding: 4 },
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
});
