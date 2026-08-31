import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { IssueThreadScreen } from '@/components/maintenance/issue-thread-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FilledButton, ScreenScroll, ScreenShell, SectionLabel, useScreenTheme } from '@/components/ui/screen-layout';
import { Colors, EstateColors } from '@/constants/theme';
import { isIssueTask } from '@/lib/issue-task';
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
  const { estateId: estateIdRaw, eventId: eventIdRaw } = useLocalSearchParams<{
    estateId: string | string[];
    eventId: string | string[];
  }>();
  const estateId = paramId(estateIdRaw);
  const eventId = paramId(eventIdRaw);
  const events = useEventStore((s) => s.events);
  const event = events.find((e) => e.id === eventId);

  if (!event) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{t('maintenanceSchedule.notFound')}</ThemedText>
      </ThemedView>
    );
  }

  if (isIssueTask(event)) {
    return <IssueThreadScreen event={event} estateId={estateId} />;
  }

  return <EditMaintenanceForm event={event} />;
}

function EditMaintenanceForm({ event: initial }: { event: EstateEvent }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const { updateEvent, deleteEvent } = useEventStore();
  const eventId = initial.id;

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? '');
  const [color, setColor] = useState(initial.color ?? EVENT_COLORS[0]);
  const [taskDate, setTaskDate] = useState(initial.date ?? '');
  const [recurrence, setRecurrence] = useState<RecurrenceFieldsValue>({
    frequency: initial.recurrence?.frequency ?? 'weekly',
    dayOfWeek: initial.recurrence?.dayOfWeek ?? 1,
    dayOfMonth: initial.recurrence?.dayOfMonth ?? 1,
    intervalMonths: initial.recurrence?.intervalMonths ?? 6,
    reminderLeadDays: initial.reminderLeadDays ?? 7,
  });

  const event = initial;

  function save() {
    if (!title.trim()) return;
    const patch: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || undefined,
      color,
    };
    if (initial.type === 'task') {
      patch.date = taskDate;
    } else {
      patch.recurrence = {
        ...initial.recurrence,
        frequency: recurrence.frequency,
        dayOfWeek:
          recurrence.frequency === 'weekly' || recurrence.frequency === 'biweekly'
            ? recurrence.dayOfWeek
            : undefined,
        dayOfMonth: usesDayOfMonth(recurrence.frequency) ? recurrence.dayOfMonth : undefined,
        intervalMonths: recurrence.frequency === 'custom' ? recurrence.intervalMonths : undefined,
        startDate: initial.recurrence?.startDate ?? initial.createdAt.slice(0, 10),
      };
    }
    patch.reminderLeadDays = recurrence.reminderLeadDays;
    void updateEvent(eventId, patch);
    router.back();
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
            router.back();
          },
        },
      ]
    );
  }

  const isRecurring = event.type === 'recurring';

  return (
    <ScreenShell title={t('titles.editEvent')}>
      <ScreenScroll contentContainerStyle={styles.form} gap={6}>
        <View style={[styles.typeBadge, { backgroundColor: colors.tint + '15' }]}>
          <IconSymbol
            name={isRecurring ? 'arrow.triangle.2.circlepath' : 'checkmark.circle.fill'}
            size={16}
            color={colors.tint}
          />
          <ThemedText style={[styles.typeBadgeText, { color: colors.tint }]}>
            {isRecurring ? t('maintenanceSchedule.recurringBadge') : t('maintenanceSchedule.oneTimeTask')}
          </ThemedText>
        </View>

        <SectionLabel>Title</SectionLabel>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
          value={title}
          onChangeText={setTitle}
          placeholderTextColor={colors.icon}
        />

        <SectionLabel>Description</SectionLabel>
        <TextInput
          style={[styles.input, styles.textArea, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          placeholderTextColor={colors.icon}
        />

        <SectionLabel>Color</SectionLabel>
        <View style={styles.colorRow}>
          {EVENT_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotSelected]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>

        {isRecurring ? (
          <RecurrenceFields value={recurrence} onChange={setRecurrence} />
        ) : (
          <>
            <SectionLabel>Date (YYYY-MM-DD)</SectionLabel>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
              value={taskDate}
              onChangeText={setTaskDate}
              keyboardType="numbers-and-punctuation"
              placeholderTextColor={colors.icon}
            />
            <RecurrenceFields value={recurrence} onChange={setRecurrence} showFrequency={false} />
          </>
        )}

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
  form: { gap: 6 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  typeBadgeText: { fontSize: 13, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: Colors.light.textOnBrand, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freqBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  freqBtnText: { fontSize: 13, fontWeight: '600' },
  dayRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dayBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  dayBtnText: { fontSize: 13, fontWeight: '600' },
  dayOfMonthRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, marginTop: 12 },
});
