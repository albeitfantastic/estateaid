import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IssueThreadScreen } from '@/components/maintenance/issue-thread-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { isIssueTask } from '@/lib/issue-task';
import { useEventStore } from '@/store/event-store';
import type { EstateEvent, RecurrenceFrequency } from '@/types';

const EVENT_COLORS = ['#22c55e', '#8B5CF6', '#0a7ea4', '#f59e0b', '#ef4444', '#B5703A', '#64748B', '#2E7D91'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FREQ_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
];

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
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { updateEvent, deleteEvent } = useEventStore();
  const eventId = initial.id;

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? '');
  const [color, setColor] = useState(initial.color ?? EVENT_COLORS[0]);
  const [taskDate, setTaskDate] = useState(initial.date ?? '');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    initial.recurrence?.frequency ?? 'weekly'
  );
  const [dayOfWeek, setDayOfWeek] = useState(initial.recurrence?.dayOfWeek ?? 1);
  const [dayOfMonth, setDayOfMonth] = useState(initial.recurrence?.dayOfMonth ?? 1);

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
        frequency,
        dayOfWeek: frequency === 'weekly' || frequency === 'biweekly' ? dayOfWeek : undefined,
        dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
      };
    }
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
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>{t('titles.editEvent')}</ThemedText>
      </View>

      <ScrollView contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 24 }]}>
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

        <ThemedText type="defaultSemiBold" style={styles.label}>Title</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
          value={title}
          onChangeText={setTitle}
          placeholderTextColor={colors.icon}
        />

        <ThemedText type="defaultSemiBold" style={styles.label}>Description</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          placeholderTextColor={colors.icon}
        />

        <ThemedText type="defaultSemiBold" style={styles.label}>Color</ThemedText>
        <View style={styles.colorRow}>
          {EVENT_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotSelected]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>

        {isRecurring && (
          <>
            <ThemedText type="defaultSemiBold" style={styles.label}>Frequency</ThemedText>
            <View style={styles.freqRow}>
              {FREQ_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.freqBtn,
                    { borderColor: colors.tint + '44' },
                    frequency === opt.value && { backgroundColor: colors.tint, borderColor: colors.tint },
                  ]}
                  onPress={() => setFrequency(opt.value)}
                  activeOpacity={0.8}
                >
                  <ThemedText style={[styles.freqBtnText, { color: frequency === opt.value ? '#fff' : colors.text }]}>
                    {opt.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {(frequency === 'weekly' || frequency === 'biweekly') && (
              <>
                <ThemedText type="defaultSemiBold" style={styles.label}>Day of Week</ThemedText>
                <View style={styles.dayRow}>
                  {DAY_NAMES.map((name, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.dayBtn,
                        { borderColor: colors.tint + '44' },
                        dayOfWeek === i && { backgroundColor: colors.tint, borderColor: colors.tint },
                      ]}
                      onPress={() => setDayOfWeek(i)}
                      activeOpacity={0.8}
                    >
                      <ThemedText style={[styles.dayBtnText, { color: dayOfWeek === i ? '#fff' : colors.text }]}>
                        {name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {frequency === 'monthly' && (
              <>
                <ThemedText type="defaultSemiBold" style={styles.label}>Day of Month</ThemedText>
                <View style={styles.dayOfMonthRow}>
                  {[1, 5, 10, 15, 20, 25].map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.dayBtn,
                        { borderColor: colors.tint + '44' },
                        dayOfMonth === d && { backgroundColor: colors.tint, borderColor: colors.tint },
                      ]}
                      onPress={() => setDayOfMonth(d)}
                      activeOpacity={0.8}
                    >
                      <ThemedText style={[styles.dayBtnText, { color: dayOfMonth === d ? '#fff' : colors.text }]}>
                        {d}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {!isRecurring && (
          <>
            <ThemedText type="defaultSemiBold" style={styles.label}>Date (YYYY-MM-DD)</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
              value={taskDate}
              onChangeText={setTaskDate}
              keyboardType="numbers-and-punctuation"
              placeholderTextColor={colors.icon}
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.tint, opacity: title.trim() ? 1 : 0.5 }]}
          onPress={save}
          disabled={!title.trim()}
          activeOpacity={0.8}
        >
          <ThemedText style={styles.saveBtnText}>Save Changes</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.deleteBtn, { borderColor: colors.error }]} onPress={confirmDelete} activeOpacity={0.7}>
          <IconSymbol name="trash" size={16} color={colors.error} />
          <ThemedText style={{ color: colors.error, fontWeight: '600' }}>{t('maintenanceSchedule.deleteItemCta')}</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  back: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 28, fontWeight: '700' },
  form: { paddingHorizontal: 20, gap: 6 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  typeBadgeText: { fontSize: 13, fontWeight: '600' },
  label: { fontSize: 13, marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freqBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  freqBtnText: { fontSize: 13, fontWeight: '600' },
  dayRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dayBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  dayBtnText: { fontSize: 13, fontWeight: '600' },
  dayOfMonthRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  saveBtn: { marginTop: 24, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, marginTop: 12 },
});
