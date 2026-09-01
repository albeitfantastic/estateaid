import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter, Redirect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { MaintenanceForm } from '@/components/maintenance/maintenance-form';
import { FocusInput, inputBaseStyle } from '@/components/ui/focus-input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SelectField } from '@/components/ui/select-field';
import { FilledButton, ScreenScroll, ScreenShell, useScreenTheme } from '@/components/ui/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { EstateColors, Radius } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';
import { useContactStore } from '@/store/contact-store';
import { useEventStore } from '@/store/event-store';
import { useExpenseStore } from '@/store/expense-store';
import { DueDatePickerModal } from '@/components/ui/due-date-picker-modal';
import { IssuePriority } from '@/types';
import { formatDate } from '@/lib/date-utils';
import { generateId, generateUuidV4 } from '@/lib/id';
import { useCan } from '@/lib/entitlements/capabilities';
import { openHostCapabilityDenied } from '@/lib/entitlements/host-gate';

const EVENT_COLORS = [...EstateColors];
const ISSUE_PRIORITIES: IssuePriority[] = ['low', 'normal', 'high', 'urgent'];

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
  const allContacts = useContactStore((s) => s.contacts);
  const allExpenses = useExpenseStore((s) => s.expenses);
  const updateExpense = useExpenseStore((s) => s.updateExpense);

  const contacts = useMemo(
    () =>
      (Array.isArray(allContacts) ? allContacts : [])
        .filter((c) => c.estateId === estateId)
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
    [allContacts, estateId]
  );
  const expenses = useMemo(
    () =>
      (Array.isArray(allExpenses) ? allExpenses : [])
        .filter((e) => e.estateId === estateId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [allExpenses, estateId]
  );

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<IssuePriority>('normal');
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [dueModalOpen, setDueModalOpen] = useState(false);
  const [taggedContactId, setTaggedContactId] = useState('');
  const [taggedExpenseId, setTaggedExpenseId] = useState('');
  const pendingNewContact = useRef(false);
  const knownContactIds = useRef(new Set(contacts.map((c) => c.id)));

  useFocusEffect(
    useCallback(() => {
      if (!pendingNewContact.current) return;
      pendingNewContact.current = false;
      const created = contacts.find((c) => !knownContactIds.current.has(c.id));
      if (created) setTaggedContactId(created.id);
    }, [contacts])
  );

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
    const text = body.trim();
    const messages =
      text || taggedContactId
        ? [
            {
              id: generateId(),
              eventId: id,
              authorId: currentUser.id,
              body: text,
              createdAt: now,
              ...(taggedContactId ? { taggedContactId } : {}),
            },
          ]
        : [];
    const { error } = await addEvent({
      id,
      estateId,
      title: title.trim(),
      description: text || undefined,
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
    if (taggedExpenseId) {
      const { error: linkError } = await updateExpense(taggedExpenseId, { eventId: id });
      if (linkError) Alert.alert(t('expenses.saveFailedTitle'), linkError);
    }
    router.back();
  }

  const contactOptions = [
    { value: '', label: t('maintenanceSchedule.noTag') },
    ...contacts.map((c) => ({
      value: c.id,
      label: c.role?.trim() ? `${c.name} · ${c.role}` : c.name,
    })),
  ];
  const expenseOptions = [
    { value: '', label: t('maintenanceSchedule.noTag') },
    ...expenses.map((e) => ({
      value: e.id,
      label: [e.amount.toFixed(2), t(`expenses.categories.${e.category}`), e.note || e.date]
        .filter(Boolean)
        .join(' · '),
    })),
  ];
  const priorityOptions = ISSUE_PRIORITIES.map((p) => ({
    value: p,
    label: t(
      p === 'low'
        ? 'maintenanceSchedule.priorityLow'
        : p === 'high'
          ? 'maintenanceSchedule.priorityHigh'
          : p === 'urgent'
            ? 'maintenanceSchedule.priorityUrgent'
            : 'maintenanceSchedule.priorityNormal'
    ),
  }));

  return (
    <ScreenShell title={t('maintenanceSchedule.newIssueTitle')}>
      <ScreenScroll contentContainerStyle={styles.form} gap={16} keyboardShouldPersistTaps="handled">
        <FocusInput
          label={t('ticketsHub.threadEditTitleLabel')}
          value={title}
          onChangeText={setTitle}
        />

        <FocusInput
          label={t('maintenanceSchedule.issueFirstMessage')}
          value={body}
          onChangeText={setBody}
        />

        <SelectField
          label={t('ticketsHub.threadEditPriority')}
          value={priority}
          options={priorityOptions}
          onChange={setPriority}
        />

        <View style={styles.field}>
          <ThemedText style={[inputBaseStyle.label, { color: colors.icon }]}>
            {t('maintenanceSchedule.dueDate')}
          </ThemedText>
          <TouchableOpacity
            style={[styles.dateTrigger, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => setDueModalOpen(true)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`${t('maintenanceSchedule.dueDate')}, ${dueDate ? formatDate(dueDate) : t('ticketsHub.newTicketPickDue')}`}
          >
            <ThemedText style={[styles.dateTriggerText, { color: colors.text }]} numberOfLines={1}>
              {dueDate ? formatDate(dueDate) : t('ticketsHub.newTicketPickDue')}
            </ThemedText>
            <IconSymbol name="chevron.down" size={18} color={colors.iconMuted} />
          </TouchableOpacity>
        </View>

        <SelectField
          label={t('maintenanceSchedule.tagContact')}
          value={taggedContactId}
          options={contactOptions}
          onChange={setTaggedContactId}
          action={{
            label: t('activitiesList.addContact'),
            onPress: () => {
              knownContactIds.current = new Set(contacts.map((c) => c.id));
              pendingNewContact.current = true;
              router.push(`/(app)/estates/${estateId}/contacts/new` as never);
            },
          }}
        />

        <SelectField
          label={t('maintenanceSchedule.tagExpense')}
          value={taggedExpenseId}
          options={expenseOptions}
          onChange={setTaggedExpenseId}
        />

        <FilledButton
          label={t('maintenanceSchedule.reportIssueCta')}
          onPress={() => void submit()}
          disabled={!title.trim()}
          style={{ marginTop: 20 }}
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

const styles = StyleSheet.create({
  form: { paddingTop: 8 },
  field: { gap: 6 },
  dateTrigger: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateTriggerText: { flex: 1, fontSize: 15 },
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
  return <MaintenanceForm estateId={estateId} />;
}
