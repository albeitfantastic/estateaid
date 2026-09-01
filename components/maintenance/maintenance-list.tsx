import { useMemo } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  FilledButton,
  GroupedList,
  GroupedRow,
  OutlineButton,
  SectionLabel,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { PriorityColors } from '@/constants/theme';
import { formatDate } from '@/lib/date-utils';
import { useCan, useManagedEstates } from '@/lib/entitlements/capabilities';
import { describeRecurrence } from '@/lib/event-utils';
import { isIssueTask } from '@/lib/issue-task';
import { useEstateStore } from '@/store/estate-store';
import { useEventStore } from '@/store/event-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import type { EstateEvent } from '@/types';

/** Maintenance items for one property, or across every property the actor manages. */
export function useMaintenanceEvents(estateId?: string): EstateEvent[] {
  const events = useEventStore((s) => s.events);
  const { estateIds } = useManagedEstates();
  return useMemo(() => {
    const scope = new Set(estateId ? [estateId] : estateIds);
    return events.filter((e) => scope.has(e.estateId));
  }, [events, estateId, estateIds]);
}

export function MaintenanceAddButtons({
  onAddTask,
  onAddRoutine,
}: {
  onAddTask: () => void;
  onAddRoutine: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.actions}>
      <FilledButton tone="accent" label={t('setupChecklist.task')} onPress={onAddTask} />
      <OutlineButton label={t('estateHub.addRoutine')} onPress={onAddRoutine} />
    </View>
  );
}

type MaintenanceListProps = {
  /** Scope to a single property; omit for every property the actor manages. */
  estateId?: string;
  /** Defaults to true when scoped to one property. */
  showDelete?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  hideWhenEmpty?: boolean;
};

export function MaintenanceList({
  estateId,
  showDelete,
  emptyTitle,
  emptySubtitle,
  emptyActionLabel,
  onEmptyAction,
  hideWhenEmpty = false,
}: MaintenanceListProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const can = useCan();
  const allEstates = useEstateStore((s) => s.estates);
  const deleteEvent = useEventStore((s) => s.deleteEvent);
  const profileById = useProfileStore((s) => s.byId);

  const events = useMaintenanceEvents(estateId);
  const withEstateName = !estateId;
  const withDelete = showDelete ?? !!estateId;

  const recurring = useMemo(() => events.filter((e) => e.type === 'recurring'), [events]);
  const calendarTasks = useMemo(
    () => events.filter((e) => e.type === 'task' && !isIssueTask(e)),
    [events]
  );
  const issueTasks = useMemo(() => events.filter((e) => isIssueTask(e)), [events]);

  const estateName = (id: string): string =>
    allEstates.find((e) => e.id === id)?.name ?? t('common.unknownEstate');

  function confirmDelete(event: EstateEvent) {
    Alert.alert(
      t('maintenanceSchedule.deleteTitle'),
      t('maintenanceSchedule.deleteMessage', { title: event.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('editEstateScreen.deleteConfirmCta'),
          style: 'destructive',
          onPress: () => void deleteEvent(event.id),
        },
      ]
    );
  }

  function deleteAction(event: EstateEvent) {
    if (!withDelete || !can('events.write', { estateId: event.estateId })) return null;
    return (
      <TouchableOpacity
        onPress={() => confirmDelete(event)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={t('maintenanceSchedule.deleteItemCta')}
      >
        <IconSymbol name="trash" size={16} color={colors.error} />
      </TouchableOpacity>
    );
  }

  function openEvent(event: EstateEvent) {
    router.push(`/(app)/estates/${event.estateId}/events/${event.id}` as never);
  }

  if (events.length === 0) {
    if (hideWhenEmpty) return null;
    return (
      <EmptyState
        icon="calendar.badge.plus"
        title={emptyTitle ?? t('maintenanceSchedule.emptyTitle')}
        subtitle={emptySubtitle ?? t('maintenanceSchedule.emptySub')}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <>
      {recurring.length > 0 && (
        <>
          <SectionLabel>
            {t('maintenanceSchedule.recurringSection', { count: recurring.length })}
          </SectionLabel>
          <GroupedList>
            {recurring.map((ev, i) => (
              <GroupedRow
                key={ev.id}
                icon="arrow.triangle.2.circlepath"
                iconColor={ev.color ?? colors.tint}
                iconBackgroundColor={(ev.color ?? colors.tint) + '22'}
                title={ev.title}
                subtitle={
                  <>
                    {withEstateName ? (
                      <ThemedText
                        style={[styles.rowSub, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {estateName(ev.estateId)}
                      </ThemedText>
                    ) : null}
                    <ThemedText
                      style={[styles.rowDesc, { color: colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {describeRecurrence(ev)}
                    </ThemedText>
                  </>
                }
                trailing={
                  deleteAction(ev) ?? (
                    <IconSymbol name="chevron.right" size={16} color={colors.icon} />
                  )
                }
                onPress={() => openEvent(ev)}
                isLast={i === recurring.length - 1}
              />
            ))}
          </GroupedList>
        </>
      )}

      {calendarTasks.length > 0 && (
        <>
          <SectionLabel marginTop={recurring.length > 0 ? 24 : 0}>
            {t('maintenanceSchedule.calendarTasksSection', { count: calendarTasks.length })}
          </SectionLabel>
          <GroupedList>
            {calendarTasks.map((ev, i) => (
              <GroupedRow
                key={ev.id}
                icon="calendar"
                iconColor={ev.color ?? colors.tint}
                iconBackgroundColor={(ev.color ?? colors.tint) + '22'}
                title={ev.title}
                subtitle={
                  <>
                    <ThemedText
                      style={[styles.rowSub, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {withEstateName ? `${estateName(ev.estateId)} · ` : ''}
                      {ev.date ?? t('maintenanceSchedule.noDate')}
                    </ThemedText>
                    {ev.description ? (
                      <ThemedText
                        style={[styles.rowDesc, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {ev.description}
                      </ThemedText>
                    ) : null}
                  </>
                }
                trailing={
                  deleteAction(ev) ?? (
                    <IconSymbol name="chevron.right" size={16} color={colors.icon} />
                  )
                }
                onPress={() => openEvent(ev)}
                isLast={i === calendarTasks.length - 1}
              />
            ))}
          </GroupedList>
        </>
      )}

      {issueTasks.length > 0 && (
        <>
          <SectionLabel marginTop={calendarTasks.length > 0 || recurring.length > 0 ? 24 : 0}>
            {t('maintenanceSchedule.issueTasksSection', { count: issueTasks.length })}
          </SectionLabel>
          <GroupedList>
            {issueTasks.map((ev, i) => {
              const guestName = ev.guestId
                ? resolveUserDisplayName(ev.guestId, profileById)
                : '—';
              const priColor = PriorityColors[(ev.priority ?? 'normal') as keyof typeof PriorityColors] ?? colors.tint;
              const messageCount = (ev.messages ?? []).length;
              return (
                <GroupedRow
                  key={ev.id}
                  icon="exclamationmark.triangle.fill"
                  iconColor={priColor}
                  iconBackgroundColor={priColor + '22'}
                  title={ev.title}
                  subtitle={
                    <>
                      <ThemedText
                        style={[styles.rowSub, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {withEstateName ? `${estateName(ev.estateId)} · ` : ''}
                        {guestName}
                        {ev.date ? ` · ${formatDate(ev.date)}` : ''}
                      </ThemedText>
                      <ThemedText style={[styles.rowDesc, { color: colors.textSecondary }]}>
                        {messageCount}{' '}
                        {messageCount === 1
                          ? t('maintenanceSchedule.messageSingular')
                          : t('maintenanceSchedule.messagePlural')}
                      </ThemedText>
                    </>
                  }
                  trailing={
                    <View style={styles.issueRight}>
                      {ev.status ? <StatusBadge status={ev.status} /> : null}
                      <IconSymbol name="chevron.right" size={16} color={colors.icon} />
                    </View>
                  }
                  onPress={() => openEvent(ev)}
                  isLast={i === issueTasks.length - 1}
                />
              );
            })}
          </GroupedList>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 12, marginBottom: 28 },
  rowSub: { fontSize: 12 },
  rowDesc: { fontSize: 11, marginTop: 2 },
  issueRight: { alignItems: 'flex-end', gap: 6 },
});
