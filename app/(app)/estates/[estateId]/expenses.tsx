import { useMemo, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { DueDatePickerModal } from '@/components/ui/due-date-picker-modal';
import { FocusInput, inputBaseStyle } from '@/components/ui/focus-input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SelectField } from '@/components/ui/select-field';
import {
  FilledButton,
  GroupedList,
  GroupedRow,
  ScreenFootnote,
  ScreenScroll,
  ScreenShell,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { Radius } from '@/constants/theme';
import { formatDate, formatDateRange, today } from '@/lib/date-utils';
import { useCan } from '@/lib/entitlements/capabilities';
import { isCalendarTask, isIssueTask } from '@/lib/issue-task';
import { useEventStore } from '@/store/event-store';
import { useExpenseStore, type ExpenseCategory } from '@/store/expense-store';
import { useStayStore } from '@/store/stay-store';

const CATEGORIES: ExpenseCategory[] = ['maintenance', 'utilities', 'supplies', 'fees', 'other'];

type LinkKind = 'none' | 'stay' | 'maintenance' | 'task';

function paramId(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return '';
}

/** Record-keeping only — not financial or tax advice. */
export default function EstateExpensesScreen() {
  const params = useLocalSearchParams<{ estateId: string | string[] }>();
  const estateId = paramId(params.estateId);
  const { colors } = useScreenTheme();
  const { t } = useTranslation();
  const canWrite = useCan()('property.edit', { estateId });
  const allExpenses = useExpenseStore((s) => s.expenses);
  const addExpense = useExpenseStore((s) => s.addExpense);
  const deleteExpense = useExpenseStore((s) => s.deleteExpense);
  const allStays = useStayStore((s) => s.stays);
  const allEvents = useEventStore((s) => s.events);
  const year = new Date().getFullYear();

  const sorted = useMemo(
    () =>
      (Array.isArray(allExpenses) ? allExpenses : [])
        .filter((e) => e.estateId === estateId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [allExpenses, estateId]
  );
  const total = useMemo(() => sorted.reduce((sum, e) => sum + e.amount, 0), [sorted]);
  const yearTotal = useMemo(
    () =>
      sorted
        .filter((e) => e.date.startsWith(String(year)))
        .reduce((sum, e) => sum + e.amount, 0),
    [sorted, year]
  );

  const stayOptions = useMemo(
    () =>
      (Array.isArray(allStays) ? allStays : [])
        .filter((s) => s.estateId === estateId)
        .sort((a, b) => b.from.localeCompare(a.from)),
    [allStays, estateId]
  );
  const maintenanceOptions = useMemo(
    () =>
      (Array.isArray(allEvents) ? allEvents : [])
        .filter((e) => e.estateId === estateId && e.type === 'recurring')
        .sort((a, b) => (b.date ?? b.createdAt).localeCompare(a.date ?? a.createdAt)),
    [allEvents, estateId]
  );
  const taskOptions = useMemo(
    () =>
      (Array.isArray(allEvents) ? allEvents : [])
        .filter((e) => e.estateId === estateId && (isCalendarTask(e) || isIssueTask(e)))
        .sort((a, b) => (b.date ?? b.createdAt).localeCompare(a.date ?? a.createdAt)),
    [allEvents, estateId]
  );

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [date, setDate] = useState(today());
  const [dateOpen, setDateOpen] = useState(false);
  const [linkKind, setLinkKind] = useState<LinkKind>('none');
  const [linkId, setLinkId] = useState('');

  const linkKindOptions = useMemo(() => {
    const opts: { value: LinkKind; label: string }[] = [
      { value: 'none', label: t('expenses.linkNone') },
    ];
    if (stayOptions.length > 0) opts.push({ value: 'stay', label: t('expenses.linkStays') });
    if (maintenanceOptions.length > 0) {
      opts.push({ value: 'maintenance', label: t('expenses.linkMaintenance') });
    }
    if (taskOptions.length > 0) opts.push({ value: 'task', label: t('expenses.linkTasks') });
    return opts;
  }, [stayOptions.length, maintenanceOptions.length, taskOptions.length, t]);

  const linkItemOptions = useMemo(() => {
    if (linkKind === 'stay') {
      return stayOptions.map((s) => ({
        value: s.id,
        label: formatDateRange(s.from, s.to),
      }));
    }
    if (linkKind === 'maintenance') {
      return maintenanceOptions.map((e) => ({ value: e.id, label: e.title }));
    }
    if (linkKind === 'task') {
      return taskOptions.map((e) => ({ value: e.id, label: e.title }));
    }
    return [];
  }, [linkKind, stayOptions, maintenanceOptions, taskOptions]);

  function chooseLinkKind(next: LinkKind) {
    setLinkKind(next);
    if (next === 'stay') setLinkId(stayOptions[0]?.id ?? '');
    else if (next === 'maintenance') setLinkId(maintenanceOptions[0]?.id ?? '');
    else if (next === 'task') setLinkId(taskOptions[0]?.id ?? '');
    else setLinkId('');
  }

  function linkLabel(stayId?: string, eventId?: string): string | null {
    if (stayId) {
      const stay = stayOptions.find((s) => s.id === stayId) ?? allStays.find((s) => s.id === stayId);
      return stay ? t('expenses.linkedStay', { from: stay.from, to: stay.to }) : null;
    }
    if (eventId) {
      const event =
        allEvents.find((e) => e.id === eventId) ??
        maintenanceOptions.find((e) => e.id === eventId) ??
        taskOptions.find((e) => e.id === eventId);
      if (!event) return null;
      if (event.type === 'task') return t('expenses.linkedTask', { title: event.title });
      return t('expenses.linkedEvent', { title: event.title });
    }
    return null;
  }

  async function onAdd() {
    const n = parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) {
      Alert.alert(t('expenses.amountRequiredTitle'), t('expenses.amountRequiredBody'));
      return;
    }
    const { error } = await addExpense({
      estateId,
      date,
      amount: n,
      category,
      note: note.trim(),
      stayId: linkKind === 'stay' ? linkId || undefined : undefined,
      eventId:
        linkKind === 'maintenance' || linkKind === 'task' ? linkId || undefined : undefined,
    });
    if (error) {
      Alert.alert(t('expenses.saveFailedTitle'), error);
      return;
    }
    setAmount('');
    setNote('');
    setLinkKind('none');
    setLinkId('');
  }

  async function onDelete(id: string) {
    const { error } = await deleteExpense(id);
    if (error) Alert.alert(t('expenses.deleteFailedTitle'), error);
  }

  return (
    <ScreenShell title={t('expenses.title')}>
      <ScreenScroll contentContainerStyle={styles.form} gap={16}>
        <ScreenFootnote>{t('expenses.disclaimer')}</ScreenFootnote>

        <View style={[styles.totals, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ThemedText type="defaultSemiBold">
            {t('expenses.total', { amount: total.toFixed(2) })}
          </ThemedText>
          <ThemedText style={{ color: colors.icon }}>
            {t('expenses.yearTotal', { year, amount: yearTotal.toFixed(2) })}
          </ThemedText>
        </View>

        <FocusInput
          label={t('expenses.amount')}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />

        <View style={styles.field}>
          <ThemedText style={[inputBaseStyle.label, { color: colors.icon }]}>
            {t('expenses.date')}
          </ThemedText>
          <TouchableOpacity
            style={[styles.dateTrigger, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => setDateOpen(true)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`${t('expenses.date')}, ${formatDate(date)}`}
          >
            <ThemedText style={[styles.dateTriggerText, { color: colors.text }]} numberOfLines={1}>
              {formatDate(date)}
            </ThemedText>
            <IconSymbol name="chevron.down" size={18} color={colors.iconMuted} />
          </TouchableOpacity>
          <DueDatePickerModal
            visible={dateOpen}
            onClose={() => setDateOpen(false)}
            onSelectDate={(d) => {
              setDate(d);
              setDateOpen(false);
            }}
            title={t('expenses.date')}
            includePastDays={365}
            selectedDate={date}
          />
        </View>

        <SelectField
          label={t('expenses.category')}
          value={category}
          options={CATEGORIES.map((c) => ({
            value: c,
            label: t(`expenses.categories.${c}`),
          }))}
          onChange={setCategory}
        />

        <FocusInput label={t('expenses.note')} value={note} onChangeText={setNote} />

        <SelectField
          label={t('expenses.linkTo')}
          value={linkKind}
          options={linkKindOptions}
          onChange={chooseLinkKind}
        />

        {linkKind !== 'none' && linkItemOptions.length > 0 ? (
          <SelectField
            label={
              linkKind === 'stay'
                ? t('expenses.linkStays')
                : linkKind === 'task'
                  ? t('expenses.linkTasks')
                  : t('expenses.linkMaintenance')
            }
            value={linkId}
            options={linkItemOptions}
            onChange={setLinkId}
          />
        ) : null}

        <FilledButton
          label={t('expenses.save')}
          onPress={() => void onAdd()}
          disabled={!canWrite}
          style={{ marginTop: 20 }}
        />

        {sorted.length > 0 ? (
          <GroupedList>
            {sorted.map((e, i) => {
              const linked = linkLabel(e.stayId, e.eventId);
              const details = [e.date, e.note || null, linked].filter(Boolean).join(' — ');
              return (
                <GroupedRow
                  key={e.id}
                  title={`${e.amount.toFixed(2)} · ${t(`expenses.categories.${e.category}`)}`}
                  subtitle={details}
                  trailing={
                    <TouchableOpacity
                      onPress={() => void onDelete(e.id)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={t('a11y.delete')}
                      disabled={!canWrite}
                    >
                      <IconSymbol name="trash" size={18} color={colors.error} />
                    </TouchableOpacity>
                  }
                  isLast={i === sorted.length - 1}
                />
              );
            })}
          </GroupedList>
        ) : null}
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  form: { paddingTop: 8 },
  totals: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
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
