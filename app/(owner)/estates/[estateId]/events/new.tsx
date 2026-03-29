import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEventStore } from '@/store/event-store';
import { EventType, RecurrenceFrequency } from '@/types';
import { today } from '@/lib/date-utils';

const EVENT_COLORS = ['#22c55e', '#8B5CF6', '#0a7ea4', '#f59e0b', '#ef4444', '#B5703A', '#64748B', '#2E7D91'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FREQ_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
];

export default function NewEvent() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const addEvent = useEventStore((s) => s.addEvent);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('recurring');
  const [color, setColor] = useState(EVENT_COLORS[0]);

  // Task fields
  const [taskDate, setTaskDate] = useState(today());

  // Recurring fields
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);

  function save() {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter an event title.');
      return;
    }

    const id = `event-${Date.now()}`;
    if (type === 'task') {
      addEvent({
        id,
        estateId,
        title: title.trim(),
        description: description.trim() || undefined,
        type: 'task',
        date: taskDate,
        color,
        createdAt: new Date().toISOString(),
      });
    } else {
      addEvent({
        id,
        estateId,
        title: title.trim(),
        description: description.trim() || undefined,
        type: 'recurring',
        recurrence: {
          frequency,
          dayOfWeek: (frequency === 'weekly' || frequency === 'biweekly') ? dayOfWeek : undefined,
          dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
          startDate: today(),
        },
        color,
        createdAt: new Date().toISOString(),
      });
    }
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>New Event</ThemedText>
      </View>

      <ScrollView contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 24 }]}>
        {/* Type picker */}
        <ThemedText type="defaultSemiBold" style={styles.label}>Type</ThemedText>
        <View style={styles.typePicker}>
          {(['recurring', 'task'] as EventType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.typeBtn,
                { borderColor: colors.tint + '44' },
                type === t && { backgroundColor: colors.tint, borderColor: colors.tint },
              ]}
              onPress={() => setType(t)}
              activeOpacity={0.8}
            >
              <IconSymbol
                name={t === 'recurring' ? 'arrow.triangle.2.circlepath' : 'checkmark.circle.fill'}
                size={18}
                color={type === t ? '#fff' : colors.tint}
              />
              <ThemedText style={[styles.typeBtnText, { color: type === t ? '#fff' : colors.text }]}>
                {t === 'recurring' ? 'Recurring' : 'One-time Task'}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Title */}
        <ThemedText type="defaultSemiBold" style={styles.label}>Title</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Glass Recycling Pickup"
          placeholderTextColor={colors.icon}
        />

        {/* Description */}
        <ThemedText type="defaultSemiBold" style={styles.label}>Description (optional)</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Additional notes..."
          placeholderTextColor={colors.icon}
          multiline
          numberOfLines={3}
        />

        {/* Color */}
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

        {/* Recurring options */}
        {type === 'recurring' && (
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

        {/* Task date */}
        {type === 'task' && (
          <>
            <ThemedText type="defaultSemiBold" style={styles.label}>Date (YYYY-MM-DD)</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
              value={taskDate}
              onChangeText={setTaskDate}
              placeholder="2026-06-15"
              placeholderTextColor={colors.icon}
              keyboardType="numbers-and-punctuation"
            />
          </>
        )}

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.tint, opacity: title.trim() ? 1 : 0.5 }]}
          onPress={save}
          disabled={!title.trim()}
          activeOpacity={0.8}
        >
          <ThemedText style={styles.saveBtnText}>Save Event</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  back: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 28, fontWeight: '700' },
  form: { paddingHorizontal: 20, gap: 6 },
  label: { fontSize: 13, marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  typePicker: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  typeBtnText: { fontSize: 14, fontWeight: '600' },
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
});
