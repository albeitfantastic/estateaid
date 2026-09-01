import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';

import { AddToCalendarButton } from '@/components/calendar/add-to-calendar-button';
import { IssueThreadScreen } from '@/components/maintenance/issue-thread-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FocusInput, inputBaseStyle } from '@/components/ui/focus-input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FilledButton, ScreenScroll, ScreenShell, useScreenTheme } from '@/components/ui/screen-layout';
import { Colors, EstateColors } from '@/constants/theme';
import { isIssueTask } from '@/lib/issue-task';
import { leaveEstateEvent } from '@/lib/open-estate-hub';
import { today } from '@/lib/date-utils';
import { usesDayOfMonth } from '@/lib/event-utils';
import { RecurrenceFields, type RecurrenceFieldsValue } from '@/components/maintenance/recurrence-fields';
import { useEventStore } from '@/store/event-store';
import type { EstateEvent } from '@/types';

const EVENT_COLORS = [...EstateColors];

function paramId(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return '';
}

export default function EstateEventDetailScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    estateId: string | string[];
    eventId: string | string[];
    fromHome?: string | string[];
  }>();
  const { estateId: estateIdRaw, eventId: eventIdRaw } = params;
  const estateId = paramId(estateIdRaw);
  const eventId = paramId(eventIdRaw);
  const events = useEventStore((s) => s.events);
  const event = events.find((e) => e.id === eventId);
  const fromHome = paramId(params.fromHome) === '1';

  if (!event) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{t('maintenanceSchedule.notFound')}</ThemedText>
      </ThemedView>
    );
  }

  if (isIssueTask(event)) {
    return <IssueThreadScreen event={event} estateId={estateId} fromHome={fromHome} />;
  }

  return <EditMaintenanceForm event={event} fromHome={fromHome} />;
}

function EditMaintenanceForm({
  event: initial,
  fromHome,
}: {
  event: EstateEvent;
  fromHome: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useScreenTheme();
  const { updateEvent, deleteEvent } = useEventStore();
  const eventId = initial.id;

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? '');
  const [color, setColor] = useState(initial.color ?? EVENT_COLORS[0]);
  const [recurrence, setRecurrence] = useState<RecurrenceFieldsValue>({
    frequency: initial.type === 'task' ? 'once' : (initial.recurrence?.frequency ?? 'weekly'),
    dayOfWeek: initial.recurrence?.dayOfWeek ?? 1,
    dayOfMonth: initial.recurrence?.dayOfMonth ?? 1,
    intervalMonths: initial.recurrence?.intervalMonths ?? 6,
    reminderLeadDays: initial.reminderLeadDays ?? 7,
    onceDate: initial.date ?? today(),
  });

  const event = initial;

  function save() {
    if (!title.trim()) return;
    const once = recurrence.frequency === 'once';
    const patch: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || undefined,
      color,
      reminderLeadDays: recurrence.reminderLeadDays,
    };
    if (once) {
      patch.type = 'task';
      patch.taskKind = initial.taskKind ?? 'calendar';
      patch.date = recurrence.onceDate.trim() || today();
      patch.recurrence = null;
    } else {
      const frequency = recurrence.frequency;
      patch.type = 'recurring';
      patch.taskKind = null;
      patch.date = null;
      patch.recurrence = {
        ...initial.recurrence,
        frequency,
        dayOfWeek:
          frequency === 'weekly' || frequency === 'biweekly' ? recurrence.dayOfWeek : undefined,
        dayOfMonth: usesDayOfMonth(frequency) ? recurrence.dayOfMonth : undefined,
        intervalMonths: frequency === 'custom' ? recurrence.intervalMonths : undefined,
        startDate: initial.recurrence?.startDate ?? initial.createdAt.slice(0, 10),
      };
    }
    void updateEvent(eventId, patch as Parameters<typeof updateEvent>[1]);
    leaveEstateEvent(fromHome);
  }

  function confirmDelete() {
    Alert.alert(
      t('maintenanceSchedule.deleteTitle'),
      t('maintenanceSchedule.deleteMessage', { title: title.trim() || initial.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('editEstateScreen.deleteConfirmCta'),
          style: 'destructive',
          onPress: () => {
            void deleteEvent(eventId);
            leaveEstateEvent(fromHome);
          },
        },
      ]
    );
  }

  return (
    <ScreenShell title={t('titles.editEvent')} onBack={() => leaveEstateEvent(fromHome)}>
      <ScreenScroll contentContainerStyle={styles.form} gap={16}>
        <FocusInput label="Title" value={title} onChangeText={setTitle} />

        <FocusInput
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={styles.description}
        />

        <View style={styles.field}>
          <ThemedText style={[inputBaseStyle.label, { color: colors.icon }]}>Color</ThemedText>
          <View style={styles.colorRow}>
            {EVENT_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotSelected]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>
        </View>

        <RecurrenceFields value={recurrence} onChange={setRecurrence} />

        <AddToCalendarButton event={event} />

        <FilledButton
          label="Save Changes"
          onPress={save}
          disabled={!title.trim()}
          style={{ marginTop: 20 }}
        />

        <TouchableOpacity style={[styles.deleteBtn, { borderColor: colors.error }]} onPress={confirmDelete} activeOpacity={0.7}>
          <IconSymbol name="trash" size={16} color={colors.error} />
          <ThemedText style={{ color: colors.error, fontWeight: '600' }}>{t('maintenanceSchedule.deleteItemCta')}</ThemedText>
        </TouchableOpacity>
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  form: { paddingTop: 8 },
  field: { gap: 6 },
  description: { minHeight: 120 },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: Colors.light.textOnBrand, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
});
