import { useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  GroupedList,
  GroupedRow,
  ScreenFootnote,
  ScreenScroll,
  ScreenShell,
  SectionLabel,
  FilledButton,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { today } from '@/lib/date-utils';
import { useCan } from '@/lib/entitlements/capabilities';
import { useEventStore } from '@/store/event-store';
import { useExpenseStore, type ExpenseCategory } from '@/store/expense-store';
import { useStayStore } from '@/store/stay-store';

const CATEGORIES: ExpenseCategory[] = ['maintenance', 'utilities', 'supplies', 'fees', 'other'];

/** Most recent linkable records; the full history would overflow the chip row. */
const MAX_LINK_OPTIONS = 8;

type ExpenseLink = { kind: 'stay' | 'event'; id: string } | null;

/** Record-keeping only — not financial or tax advice. */
export default function EstateExpensesScreen() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const { colors } = useScreenTheme();
  const { t } = useTranslation();
  const canWrite = useCan()('property.edit', { estateId });
  const allExpenses = useExpenseStore((s) => s.expenses);
  const addExpense = useExpenseStore((s) => s.addExpense);
  const deleteExpense = useExpenseStore((s) => s.deleteExpense);
  const stays = useStayStore((s) => s.stays);
  const events = useEventStore((s) => s.events);
  const year = new Date().getFullYear();

  const sorted = useMemo(
    () =>
      allExpenses
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
      stays
        .filter((s) => s.estateId === estateId)
        .sort((a, b) => b.from.localeCompare(a.from))
        .slice(0, MAX_LINK_OPTIONS),
    [stays, estateId]
  );
  const eventOptions = useMemo(
    () =>
      events
        .filter((e) => e.estateId === estateId)
        .sort((a, b) => (b.date ?? b.createdAt).localeCompare(a.date ?? a.createdAt))
        .slice(0, MAX_LINK_OPTIONS),
    [events, estateId]
  );

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [date, setDate] = useState(today());
  const [link, setLink] = useState<ExpenseLink>(null);

  function linkLabel(stayId?: string, eventId?: string): string | null {
    if (stayId) {
      const stay = stays.find((s) => s.id === stayId);
      return stay ? t('expenses.linkedStay', { from: stay.from, to: stay.to }) : null;
    }
    if (eventId) {
      const event = events.find((e) => e.id === eventId);
      return event ? t('expenses.linkedEvent', { title: event.title }) : null;
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
      stayId: link?.kind === 'stay' ? link.id : undefined,
      eventId: link?.kind === 'event' ? link.id : undefined,
    });
    if (error) {
      Alert.alert(t('expenses.saveFailedTitle'), error);
      return;
    }
    setAmount('');
    setNote('');
    setLink(null);
  }

  async function onDelete(id: string) {
    const { error } = await deleteExpense(id);
    if (error) Alert.alert(t('expenses.deleteFailedTitle'), error);
  }

  function chipStyle(active: boolean) {
    return [
      styles.chip,
      { borderColor: colors.border },
      active && { backgroundColor: colors.tint, borderColor: colors.tint },
    ];
  }

  function chipTextColor(active: boolean) {
    return { color: active ? colors.textOnBrand : colors.text, fontSize: 12 };
  }

  return (
    <ScreenShell title={t('expenses.title')}>
      <ScreenScroll gap={16}>
        <ScreenFootnote>{t('expenses.disclaimer')}</ScreenFootnote>

        <View style={[styles.totals, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ThemedText type="defaultSemiBold">
            {t('expenses.total', { amount: total.toFixed(2) })}
          </ThemedText>
          <ThemedText style={{ color: colors.icon }}>
            {t('expenses.yearTotal', { year, amount: yearTotal.toFixed(2) })}
          </ThemedText>
        </View>

        <SectionLabel>{t('expenses.addEntry')}</SectionLabel>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder={t('expenses.amount')}
          placeholderTextColor={colors.icon}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder={t('expenses.datePlaceholder')}
          placeholderTextColor={colors.icon}
          value={date}
          onChangeText={setDate}
        />
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={chipStyle(category === c)}
              onPress={() => setCategory(c)}
            >
              <ThemedText style={chipTextColor(category === c)}>
                {t(`expenses.categories.${c}`)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder={t('expenses.note')}
          placeholderTextColor={colors.icon}
          value={note}
          onChangeText={setNote}
        />

        <SectionLabel>{t('expenses.linkTo')}</SectionLabel>
        {stayOptions.length === 0 && eventOptions.length === 0 ? (
          <ScreenFootnote>{t('expenses.noLinkable')}</ScreenFootnote>
        ) : (
          <>
            <View style={styles.chips}>
              <TouchableOpacity style={chipStyle(link === null)} onPress={() => setLink(null)}>
                <ThemedText style={chipTextColor(link === null)}>
                  {t('expenses.linkNone')}
                </ThemedText>
              </TouchableOpacity>
            </View>
            {stayOptions.length > 0 && (
              <>
                <ThemedText style={[styles.linkGroup, { color: colors.icon }]}>
                  {t('expenses.linkStays')}
                </ThemedText>
                <View style={styles.chips}>
                  {stayOptions.map((s) => {
                    const active = link?.kind === 'stay' && link.id === s.id;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={chipStyle(active)}
                        onPress={() => setLink(active ? null : { kind: 'stay', id: s.id })}
                      >
                        <ThemedText style={chipTextColor(active)}>
                          {s.from} – {s.to}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
            {eventOptions.length > 0 && (
              <>
                <ThemedText style={[styles.linkGroup, { color: colors.icon }]}>
                  {t('expenses.linkMaintenance')}
                </ThemedText>
                <View style={styles.chips}>
                  {eventOptions.map((e) => {
                    const active = link?.kind === 'event' && link.id === e.id;
                    return (
                      <TouchableOpacity
                        key={e.id}
                        style={chipStyle(active)}
                        onPress={() => setLink(active ? null : { kind: 'event', id: e.id })}
                      >
                        <ThemedText style={chipTextColor(active)} numberOfLines={1}>
                          {e.title}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}

        <FilledButton label={t('expenses.save')} onPress={onAdd} disabled={!canWrite} />

        {sorted.length > 0 && (
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
                      onPress={() => onDelete(e.id)}
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
        )}
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  totals: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, maxWidth: 220 },
  linkGroup: { fontSize: 12, marginTop: 2 },
});
