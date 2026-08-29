import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { FocusInput } from '@/components/ui/focus-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts, Layout, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEventStore } from '@/store/event-store';
import { DueDatePickerModal } from '@/components/ui/due-date-picker-modal';
import { EventType, IssuePriority, RecurrenceFrequency } from '@/types';
import { formatDate, today } from '@/lib/date-utils';
import { generateId, generateUuidV4 } from '@/lib/id';
import { MAINTENANCE_TEMPLATES } from '@/lib/onboarding-starters';
import { useCan } from '@/lib/entitlements/capabilities';
import { openHostCapabilityDenied } from '@/lib/entitlements/host-gate';

const EVENT_COLORS = ['#22c55e', '#8B5CF6', '#0a7ea4', '#f59e0b', '#ef4444', '#B5703A', '#64748B', '#2E7D91'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FREQ_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
];

const ISSUE_PRIORITIES: { value: IssuePriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#22c55e' },
  { value: 'normal', label: 'Normal', color: '#3b82f6' },
  { value: 'high', label: 'High', color: '#f59e0b' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
];

function paramId(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return '';
}

function NewMaintenanceIssueScreen({ estateId }: { estateId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const addEvent = useEventStore((s) => s.addEvent);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<IssuePriority>('normal');
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [dueModalOpen, setDueModalOpen] = useState(false);

  async function submit() {
    if (!title.trim()) {
      Alert.alert(t('common.error'), t('ticketsHub.threadTitleRequired'));
      return;
    }
    if (!currentUser?.id) {
      Alert.alert(t('common.error'), t('maintenanceSchedule.propertyMissingBody'));
      return;
    }
    const id = generateUuidV4();
    const now = new Date().toISOString();
    const messages = body.trim()
      ? [
          {
            id: generateId(),
            eventId: id,
            authorId: currentUser.id,
            body: body.trim(),
            createdAt: now,
          },
        ]
      : [];
    const { error } = await addEvent({
      id,
      estateId,
      title: title.trim(),
      type: 'task',
      taskKind: 'issue',
      date: dueDate ?? undefined,
      color: EVENT_COLORS[3],
      createdAt: now,
      updatedAt: now,
      guestId: currentUser.id,
      status: 'open',
      priority,
      messages,
    });
    if (error) {
      Alert.alert(t('maintenanceSchedule.saveFailedTitle'), error);
      return;
    }
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Layout.sectionGap - 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>
          {t('maintenanceSchedule.newIssueTitle')}
        </ThemedText>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + Spacing.xl * 2 }]}
      >
        <FocusInput label={t('ticketsHub.threadEditTitleLabel')} placeholder="" value={title} onChangeText={setTitle} />
        <FocusInput
          label={t('maintenanceSchedule.issueFirstMessage')}
          placeholder={t('ticketsHub.threadReplyPlaceholder')}
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={styles.issueMessageInput}
        />
        <View style={styles.issuePriorityBlock}>
        <ThemedText style={[styles.label, { color: colors.icon }]}>{t('ticketsHub.threadEditPriority')}</ThemedText>
        <View style={styles.issuePriRow}>
          {ISSUE_PRIORITIES.map((p) => {
            const selected = p.value === priority;
            return (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.issuePriPill,
                  {
                    backgroundColor: selected ? p.color + '22' : colors.tint + '08',
                    borderColor: selected ? p.color : colors.icon + '33',
                  },
                ]}
                onPress={() => setPriority(p.value)}
              >
                <ThemedText style={[styles.issuePriText, selected && { color: p.color, fontWeight: '700' }]}>
                  {p.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
        </View>
        <ThemedText style={[styles.label, { color: colors.icon, marginTop: Spacing.xs }]}>
          {t('ticketsHub.newTicketDueOptional')}
        </ThemedText>
        <TouchableOpacity
          style={[styles.duePickBtn, { borderColor: colors.icon + '44' }]}
          onPress={() => setDueModalOpen(true)}
        >
          <ThemedText style={{ color: colors.text }}>
            {dueDate ? formatDate(dueDate) : t('ticketsHub.newTicketPickDue')}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.tint, opacity: title.trim() ? 1 : 0.5 }]}
          onPress={() => void submit()}
          disabled={!title.trim()}
        >
          <ThemedText style={styles.saveBtnText}>{t('maintenanceSchedule.reportIssueCta')}</ThemedText>
        </TouchableOpacity>
      </ScrollView>
      <DueDatePickerModal
        visible={dueModalOpen}
        onClose={() => setDueModalOpen(false)}
        onSelectDate={(d) => {
          setDueDate(d);
          setDueModalOpen(false);
        }}
        onClear={() => {
          setDueDate(null);
          setDueModalOpen(false);
        }}
        title={t('ticketsHub.newTicketPickDue')}
        clearLabel={t('ticketsHub.newTicketClearDue')}
      />
    </ThemedView>
  );
}

function NewMaintenanceCalendarScreen({ estateId }: { estateId: string }) {
  const { t } = useTranslation();
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

  function applyTemplate(id: string) {
    const tpl = MAINTENANCE_TEMPLATES.find((x) => x.id === id);
    if (!tpl) return;
    setTitle(tpl.title);
    setDescription(tpl.body);
    setType('recurring');
    setFrequency('monthly');
    setDayOfMonth(1);
  }

  async function save() {
    if (!title.trim()) {
      Alert.alert(t('maintenanceSchedule.missingTitle'), t('maintenanceSchedule.missingTitleBody'));
      return;
    }
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
    } as const;

    const result =
      type === 'task'
        ? await addEvent({
            ...base,
            type: 'task' as const,
            taskKind: 'calendar',
            date: taskDate,
          })
        : await addEvent({
            ...base,
            type: 'recurring' as const,
            recurrence: {
              frequency,
              dayOfWeek: frequency === 'weekly' || frequency === 'biweekly' ? dayOfWeek : undefined,
              dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
              startDate: today(),
            },
          });

    if (result.error) {
      Alert.alert(t('maintenanceSchedule.saveFailedTitle'), result.error);
      return;
    }
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Layout.sectionGap - 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>{t('titles.newEvent')}</ThemedText>
      </View>

      <ScrollView contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <ThemedText style={[styles.label, { color: colors.icon }]}>Templates</ThemedText>
        <View style={styles.issuePriRow}>
          {MAINTENANCE_TEMPLATES.map((tpl) => (
            <TouchableOpacity
              key={tpl.id}
              style={[styles.issuePriPill, { borderColor: colors.border }]}
              onPress={() => applyTemplate(tpl.id)}
              activeOpacity={0.75}
            >
              <ThemedText style={styles.issuePriText}>{tpl.title}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Type picker */}
        <ThemedText style={[styles.label, { color: colors.icon }]}>Type</ThemedText>
        <View style={styles.typePicker}>
          {(['recurring', 'task'] as EventType[]).map((kind) => (
            <TouchableOpacity
              key={kind}
              style={[
                styles.typeBtn,
                { borderColor: colors.tint + '44' },
                type === kind && { backgroundColor: colors.tint, borderColor: colors.tint },
              ]}
              onPress={() => setType(kind)}
              activeOpacity={0.8}
            >
              <IconSymbol
                name={kind === 'recurring' ? 'arrow.triangle.2.circlepath' : 'checkmark.circle.fill'}
                size={18}
                color={type === kind ? '#fff' : colors.tint}
              />
              <ThemedText style={[styles.typeBtnText, { color: type === kind ? '#fff' : colors.text }]}>
                {kind === 'recurring' ? t('maintenanceSchedule.typeRecurring') : t('maintenanceSchedule.oneTimeTask')}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Title */}
        <FocusInput label="Title" placeholder="e.g. Glass Recycling Pickup" value={title} onChangeText={setTitle} />

        {/* Description */}
        <FocusInput label="Description (optional)" placeholder="Additional notes..." value={description} onChangeText={setDescription} multiline numberOfLines={3} textAlignVertical="top" style={styles.textArea} />

        {/* Color */}
        <ThemedText style={[styles.label, { paddingTop: 24 },  { color: colors.icon }]}>Color</ThemedText>
        <View style={[styles.colorRow, ]}>
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
            <ThemedText style={[styles.label, { color: colors.icon }]}>Frequency</ThemedText>
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
                <ThemedText style={[styles.label, { color: colors.icon }]}>Day of Week</ThemedText>
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
                <ThemedText style={[styles.label, { color: colors.icon }]}>Day of Month</ThemedText>
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
          <FocusInput label="Date (YYYY-MM-DD)" placeholder="2026-06-15" value={taskDate} onChangeText={setTaskDate} keyboardType="numbers-and-punctuation" />
        )}

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.tint, shadowColor: colors.tint, opacity: title.trim() ? 1 : 0.5 }]}
          onPress={save}
          disabled={!title.trim()}
          activeOpacity={0.8}
        >
          <ThemedText style={styles.saveBtnText}>{t('maintenanceSchedule.saveButton')}</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPaddingX,
    paddingBottom: Layout.sectionGap - 8,
    gap: 12,
  },
  back: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 28, fontWeight: '700' },
  form: { paddingHorizontal: Layout.screenPaddingX, gap: 16 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: Fonts.labelBold },
  textArea: { minHeight: 80, paddingTop: 14, textAlignVertical: 'top' },
  typePicker: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5 },
  typeBtnText: { fontSize: 14, fontWeight: '600', fontFamily: Fonts.headingSemiBold },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot: { width: 34, height: 34, borderRadius: 17 },
  colorDotSelected: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freqBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5 },
  freqBtnText: { fontSize: 13, fontWeight: '600', fontFamily: Fonts.headingSemiBold },
  dayRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dayBtn: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5 },
  dayBtnText: { fontSize: 13, fontWeight: '600', fontFamily: Fonts.headingSemiBold },
  dayOfMonthRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  saveBtn: {
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: Radius.lg,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: Fonts.heading, letterSpacing: 0.3 },
  issuePriRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  issuePriPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  issuePriText: { fontSize: 13, fontWeight: '600' },
  duePickBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 48,
  },
  issueMessageInput: { minHeight: 108 },
  issuePriorityBlock: { marginTop: Spacing.md, gap: 8 },
});

export default function NewEvent() {
  const params = useLocalSearchParams<{ estateId?: string | string[]; kind?: string | string[] }>();
  const estateId = paramId(params.estateId);
  const canWrite = useCan()('events.write', { estateId });
  useEffect(() => {
    if (!canWrite) {
      openHostCapabilityDenied(estateId, 'events.write', `/(app)/estates/${estateId}/events`);
    }
  }, [canWrite, estateId]);
  if (!canWrite) {
    return <Redirect href={`/(app)/estates/${estateId}/events` as never} />;
  }
  const kindRaw = params.kind;
  const kind =
    typeof kindRaw === 'string' ? kindRaw : Array.isArray(kindRaw) ? kindRaw[0] : undefined;
  if (kind === 'issue') return <NewMaintenanceIssueScreen estateId={estateId} />;
  return <NewMaintenanceCalendarScreen estateId={estateId} />;
}
