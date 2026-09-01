import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';

import { AddToCalendarButton } from '@/components/calendar/add-to-calendar-button';
import { RecurrenceFields, type RecurrenceFieldsValue } from '@/components/maintenance/recurrence-fields';
import { ThemedText } from '@/components/themed-text';
import { FocusInput, inputBaseStyle } from '@/components/ui/focus-input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FilledButton, ScreenScroll, ScreenShell, useScreenTheme } from '@/components/ui/screen-layout';
import { Colors, EstateColors } from '@/constants/theme';
import { today } from '@/lib/date-utils';
import { usesDayOfMonth } from '@/lib/event-utils';
import { generateUuidV4 } from '@/lib/id';
import { leaveEstateEvent } from '@/lib/open-estate-hub';
import { useEventStore } from '@/store/event-store';
import type { EstateEvent } from '@/types';

const EVENT_COLORS = [...EstateColors];

type MaintenanceFormProps = {
  estateId: string;
  event?: EstateEvent;
  fromHome?: boolean;
};

export function MaintenanceForm({ estateId, event, fromHome = false }: MaintenanceFormProps) {
  const { t } = useTranslation();
  const { colors } = useScreenTheme();
  const { addEvent, updateEvent, deleteEvent } = useEventStore();
  const isCreate = !event;

  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [color, setColor] = useState(event?.color ?? EVENT_COLORS[0]);
  const [recurrence, setRecurrence] = useState<RecurrenceFieldsValue>({
    frequency: event?.type === 'task' ? 'once' : (event?.recurrence?.frequency ?? 'weekly'),
    dayOfWeek: event?.recurrence?.dayOfWeek ?? 1,
    dayOfMonth: event?.recurrence?.dayOfMonth ?? 1,
    intervalMonths: event?.recurrence?.intervalMonths ?? 6,
    reminderLeadDays: event?.reminderLeadDays ?? 7,
    onceDate: event?.date ?? today(),
  });

  function close() {
    leaveEstateEvent(fromHome);
  }

  async function save() {
    if (!title.trim()) return;
    const once = recurrence.frequency === 'once';
    const frequency = recurrence.frequency;

    if (isCreate) {
      if (!estateId) {
        Alert.alert(t('common.error'), t('maintenanceSchedule.propertyMissingBody'));
        return;
      }
      const id = generateUuidV4();
      const createdAt = new Date().toISOString();
      const base = {
        id,
        estateId,
        title: title.trim(),
        description: description.trim() || undefined,
        color,
        createdAt,
        reminderLeadDays: recurrence.reminderLeadDays,
      };
      const result = once
        ? await addEvent({
            ...base,
            type: 'task',
            taskKind: 'calendar',
            date: recurrence.onceDate.trim() || today(),
          })
        : await addEvent({
            ...base,
            type: 'recurring',
            recurrence: {
              frequency,
              dayOfWeek:
                frequency === 'weekly' || frequency === 'biweekly' ? recurrence.dayOfWeek : undefined,
              dayOfMonth: usesDayOfMonth(frequency) ? recurrence.dayOfMonth : undefined,
              intervalMonths: frequency === 'custom' ? recurrence.intervalMonths : undefined,
              startDate: today(),
            },
          });
      if (result.error) {
        Alert.alert(t('maintenanceSchedule.saveFailedTitle'), result.error);
        return;
      }
      close();
      return;
    }

    const patch: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || undefined,
      color,
      reminderLeadDays: recurrence.reminderLeadDays,
    };
    if (once) {
      patch.type = 'task';
      patch.taskKind = event.taskKind ?? 'calendar';
      patch.date = recurrence.onceDate.trim() || today();
      patch.recurrence = null;
    } else {
      patch.type = 'recurring';
      patch.taskKind = null;
      patch.date = null;
      patch.recurrence = {
        ...event.recurrence,
        frequency,
        dayOfWeek:
          frequency === 'weekly' || frequency === 'biweekly' ? recurrence.dayOfWeek : undefined,
        dayOfMonth: usesDayOfMonth(frequency) ? recurrence.dayOfMonth : undefined,
        intervalMonths: frequency === 'custom' ? recurrence.intervalMonths : undefined,
        startDate: event.recurrence?.startDate ?? event.createdAt.slice(0, 10),
      };
    }
    void updateEvent(event.id, patch as Parameters<typeof updateEvent>[1]);
    close();
  }

  function confirmDelete() {
    if (!event) return;
    Alert.alert(
      t('maintenanceSchedule.deleteTitle'),
      t('maintenanceSchedule.deleteMessage', { title: title.trim() || event.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('editEstateScreen.deleteConfirmCta'),
          style: 'destructive',
          onPress: () => {
            void deleteEvent(event.id);
            close();
          },
        },
      ]
    );
  }

  return (
    <ScreenShell
      title={isCreate ? t('titles.newEvent') : t('titles.editEvent')}
      onBack={close}
    >
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

        {event ? <AddToCalendarButton event={event} /> : null}

        <FilledButton
          label={isCreate ? t('maintenanceSchedule.saveButton') : 'Save Changes'}
          onPress={() => void save()}
          disabled={!title.trim()}
          style={{ marginTop: 20 }}
        />

        {event ? (
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: colors.error }]}
            onPress={confirmDelete}
            activeOpacity={0.7}
          >
            <IconSymbol name="trash" size={16} color={colors.error} />
            <ThemedText style={{ color: colors.error, fontWeight: '600' }}>
              {t('maintenanceSchedule.deleteItemCta')}
            </ThemedText>
          </TouchableOpacity>
        ) : null}
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  form: { paddingTop: 8 },
  field: { gap: 6 },
  description: { minHeight: 120 },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: Colors.light.textOnBrand,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
});
