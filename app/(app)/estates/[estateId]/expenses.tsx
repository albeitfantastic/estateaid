import { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { today } from '@/lib/date-utils';
import { useExpenseStore, type ExpenseCategory } from '@/store/expense-store';

const CATEGORIES: ExpenseCategory[] = ['maintenance', 'utilities', 'supplies', 'fees', 'other'];

/** Record-keeping only — not financial or tax advice. */
export default function EstateExpensesScreen() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const allExpenses = useExpenseStore((s) => s.expenses);
  const addExpense = useExpenseStore((s) => s.addExpense);
  const deleteExpense = useExpenseStore((s) => s.deleteExpense);
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

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [date, setDate] = useState(today());

  function onAdd() {
    const n = parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) {
      Alert.alert('Amount required', 'Enter a positive amount.');
      return;
    }
    addExpense({ estateId, date, amount: n, category, note: note.trim() });
    setAmount('');
    setNote('');
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>
          Expenses
        </ThemedText>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
        <ThemedText style={[styles.disclaimer, { color: colors.icon }]}>
          Record-keeping only. Figures are not tax or financial advice.
        </ThemedText>
        <View style={[styles.totals, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ThemedText type="defaultSemiBold">Total: {total.toFixed(2)}</ThemedText>
          <ThemedText style={{ color: colors.icon }}>
            {year}: {yearTotal.toFixed(2)}
          </ThemedText>
        </View>

        <ThemedText style={[styles.label, { color: colors.icon }]}>Add entry</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder="Amount"
          placeholderTextColor={colors.icon}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder="Date YYYY-MM-DD"
          placeholderTextColor={colors.icon}
          value={date}
          onChangeText={setDate}
        />
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.chip,
                { borderColor: colors.border },
                category === c && { backgroundColor: colors.tint, borderColor: colors.tint },
              ]}
              onPress={() => setCategory(c)}
            >
              <ThemedText style={{ color: category === c ? '#fff' : colors.text, fontSize: 12 }}>
                {c}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder="Note"
          placeholderTextColor={colors.icon}
          value={note}
          onChangeText={setNote}
        />
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.tint }]}
          onPress={onAdd}
          activeOpacity={0.85}
        >
          <ThemedText style={styles.addBtnText}>Save expense</ThemedText>
        </TouchableOpacity>

        {sorted.map((e) => (
          <View key={e.id} style={[styles.row, { borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">
                {e.amount.toFixed(2)} · {e.category}
              </ThemedText>
              <ThemedText style={{ color: colors.icon, fontSize: 12 }}>
                {e.date}
                {e.note ? ` — ${e.note}` : ''}
              </ThemedText>
            </View>
            <TouchableOpacity onPress={() => deleteExpense(e.id)} hitSlop={10}>
              <IconSymbol name="trash" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  back: { padding: 8, marginRight: 4 },
  title: { flex: 1, fontSize: 24, fontWeight: '700' },
  disclaimer: { fontSize: 12, marginBottom: 12 },
  totals: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 4, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  addBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  addBtnText: { color: '#fff', fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
});
