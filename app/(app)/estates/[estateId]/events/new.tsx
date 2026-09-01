import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { FocusInput } from '@/components/ui/focus-input';
import { FilledButton, ScreenScroll, ScreenShell, SectionLabel, useScreenTheme } from '@/components/ui/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { EstateColors, Fonts, PriorityColors, Spacing, Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';
import { useEventStore } from '@/store/event-store';
import { DueDatePickerModal } from '@/components/ui/due-date-picker-modal';
import { EventType, IssuePriority } from '@/types';
import { formatDate, today } from '@/lib/date-utils';
import { generateId, generateUuidV4 } from '@/lib/id';
import { usesDayOfMonth } from '@/lib/event-utils';
import { RecurrenceFields, type RecurrenceFieldsValue } from '@/components/maintenance/recurrence-fields';
import { useCan } from '@/lib/entitlements/capabilities';
import { openHostCapabilityDenied } from '@/lib/entitlements/host-gate';

const EVENT_COLORS = [...EstateColors];
const ISSUE_PRIORITIES: { value: IssuePriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: PriorityColors.low },
  { value: 'normal', label: 'Normal', color: PriorityColors.normal },
  { value: 'high', label: 'High', color: PriorityColors.high },
  { value: 'urgent', label: 'Urgent', color: PriorityColors.urgent },
];

function paramId(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return '';
}

function NewMaintenanceIssueScreen({ estateId }: { estateId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useScreenTheme();
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
    <ScreenShell title={t('maintenanceSchedule.newIssueTitle')}>
      <ScreenScroll contentContainerStyle={styles.form} gap={16} keyboardShouldPersistTaps="handled">
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
        <SectionLabel>{t('ticketsHub.threadEditPriority')}</SectionLabel>
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
        <SectionLabel style={{ marginTop: Spacing.xs }}>
          {t('ticketsHub.newTicketDueOptional')}
        </SectionLabel>
        <TouchableOpacity
          style={[styles.duePickBtn, { borderColor: colors.icon + '44' }]}
          onPress={() => setDueModalOpen(true)}
        >
          <ThemedText style={{ color: colors.text }}>
            {dueDate ? formatDate(dueDate) : t('ticketsHub.newTicketPickDue')}
          </ThemedText>
        </TouchableOpacity>
        <FilledButton
          label={t('maintenanceSchedule.reportIssueCta')}
          onPress={() => void submit()}
          disabled={!title.trim()}
        />
      </ScreenScroll>
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
    </ScreenShell>
  );
}

function NewMaintenanceCalendarScreen({ estateId }: { estateId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const addEvent = useEventStore((s) => s.addEvent);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('recurring');
  const [color, setColor] = useState(EVENT_COLORS[0]);

  // Task fields
  const [taskDate, setTaskDate] = useState(today());
  const [recurrence, setRecurrence] = useState<RecurrenceFieldsValue>({
    frequency: 'weekly',
    dayOfWeek: 1,
    dayOfMonth: 1,
    intervalMonths: 6,
    reminderLeadDays: 7,
    onceDate: today(),
  });

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
    const { frequency, dayOfWeek, dayOfMonth, intervalMonths, reminderLeadDays, onceDate } = recurrence;
    const base = {
      id,
      estateId,
      title: title.trim(),
      description: description.trim() || undefined,
      color,
      createdAt,
      reminderLeadDays,
    } as const;

    const once = type === 'task' || frequency === 'once';
    const result = once
      ? await addEvent({
          ...base,
          type: 'task' as const,
          taskKind: 'calendar',
          date: frequency === 'once' ? onceDate.trim() || today() : taskDate,
        })
      : await addEvent({
          ...base,
          type: 'recurring' as const,
          recurrence: {
            frequency,
            dayOfWeek: frequency === 'weekly' || frequency === 'biweekly' ? dayOfWeek : undefined,
            dayOfMonth: usesDayOfMonth(frequency) ? dayOfMonth : undefined,
            intervalMonths: frequency === 'custom' ? intervalMonths : undefined,
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
    <ScreenShell title={t('titles.newEvent')}>
      <ScreenScroll contentContainerStyle={styles.form} gap={16}>
        <SectionLabel>Type</SectionLabel>
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
                color={type === kind ? colors.textOnBrand : colors.tint}
              />
              <ThemedText style={[styles.typeBtnText, { color: type === kind ? colors.textOnBrand : colors.text }]}>
                {kind === 'recurring' ? t('maintenanceSchedule.typeRecurring') : t('maintenanceSchedule.oneTimeTask')}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Title */}
        <FocusInput label="Title" placeholder="e.g. Glass Recycling Pickup" value={title} onChangeText={setTitle} />

        {/* Description */}
        <FocusInput label="Description (optional)" placeholder="Additional notes..." value={description} onChangeText={setDescription} multiline numberOfLines={3} textAlignVertical="top" style={styles.textArea} />

        <SectionLabel style={{ paddingTop: 24 }}>Color</SectionLabel>
        <View style={[styles.colorRow, ]}>
          {EVENT_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotSelected]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>

        {type === 'recurring' ? (
          <RecurrenceFields value={recurrence} onChange={setRecurrence} />
        ) : (
          <>
            <FocusInput
              label="Date (YYYY-MM-DD)"
              placeholder="2026-06-15"
              value={taskDate}
              onChangeText={setTaskDate}
              keyboardType="numbers-and-punctuation"
            />
            <RecurrenceFields
              value={recurrence}
              onChange={setRecurrence}
              showFrequency={false}
            />
          </>
        )}

        {/* Save */}
        <FilledButton
          label={t('maintenanceSchedule.saveButton')}
          onPress={save}
          disabled={!title.trim()}
        />
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  textArea: { minHeight: 80, paddingTop: 14, textAlignVertical: 'top' },
  typePicker: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5 },
  typeBtnText: { fontSize: 14, fontWeight: '600', fontFamily: Fonts.headingSemiBold },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot: { width: 34, height: 34, borderRadius: 17 },
  colorDotSelected: { borderWidth: 3, borderColor: Colors.light.textOnBrand, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freqBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5 },
  freqBtnText: { fontSize: 13, fontWeight: '600', fontFamily: Fonts.headingSemiBold },
  dayRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dayBtn: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5 },
  dayBtnText: { fontSize: 13, fontWeight: '600', fontFamily: Fonts.headingSemiBold },
  dayOfMonthRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
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
