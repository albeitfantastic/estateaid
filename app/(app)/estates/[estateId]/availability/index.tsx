import { Alert, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { SectionHeader } from '@/components/ui/section-header';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FocusInput } from '@/components/ui/focus-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { generateUuidV4 } from '@/lib/id';
import { formatDateRange } from '@/lib/date-utils';
import { useAvailabilityRuleStore } from '@/store/availability-rule-store';
import type { AvailabilityRuleKind, EstateAvailabilityRule } from '@/types/availability-rule';
import { useCan } from '@/lib/entitlements/capabilities';
import { openHostCapabilityDenied } from '@/lib/entitlements/host-gate';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MM_DD = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

function describeRule(r: EstateAvailabilityRule): string {
  switch (r.kind) {
    case 'blackout':
      return r.from && r.to ? formatDateRange(r.from, r.to) : 'Incomplete dates';
    case 'annual_closure':
      return r.annualFrom && r.annualTo ? `${r.annualFrom} → ${r.annualTo} each year` : 'Incomplete season';
    case 'min_nights':
      return r.minNights != null ? `At least ${r.minNights} nights` : '—';
    case 'max_advance_days':
      return r.maxAdvanceDays != null ? `Check-in within ${r.maxAdvanceDays} days from today` : '—';
    default:
      return '';
  }
}

function kindLabel(k: AvailabilityRuleKind): string {
  switch (k) {
    case 'blackout':
      return 'Blackout dates';
    case 'annual_closure':
      return 'Seasonal closure';
    case 'min_nights':
      return 'Minimum stay';
    case 'max_advance_days':
      return 'Max advance booking';
    default:
      return k;
  }
}

export default function AvailabilityRulesScreen() {
  const { t } = useTranslation();
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { rules, addRule, updateRule, deleteRule, fetchFromSupabase } = useAvailabilityRuleStore();
  const canWrite = useCan()('availability.write', { estateId });

  const [addingKind, setAddingKind] = useState<AvailabilityRuleKind | null>(null);
  const [title, setTitle] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [annualFrom, setAnnualFrom] = useState('');
  const [annualTo, setAnnualTo] = useState('');
  const [minNightsStr, setMinNightsStr] = useState('');
  const [maxAdvanceStr, setMaxAdvanceStr] = useState('');

  useEffect(() => {
    void fetchFromSupabase();
  }, [fetchFromSupabase]);

  const estateRules = useMemo(
    () => rules.filter((r) => r.estateId === estateId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [rules, estateId]
  );

  const blocking = estateRules.filter((r) => r.kind === 'blackout' || r.kind === 'annual_closure');
  const limits = estateRules.filter((r) => r.kind === 'min_nights' || r.kind === 'max_advance_days');

  function resetForm() {
    setAddingKind(null);
    setTitle('');
    setFrom('');
    setTo('');
    setAnnualFrom('');
    setAnnualTo('');
    setMinNightsStr('');
    setMaxAdvanceStr('');
  }

  function startAdd(kind: AvailabilityRuleKind) {
    if (!canWrite) {
      openHostCapabilityDenied(estateId, 'availability.write', `/(app)/estates/${estateId}/availability`);
      return;
    }
    setAddingKind(kind);
    setTitle('');
    setFrom('');
    setTo('');
    setAnnualFrom('');
    setAnnualTo('');
    setMinNightsStr('');
    setMaxAdvanceStr('');
  }

  async function saveNew() {
    if (!addingKind) return;
    const now = new Date().toISOString();
    const base = {
      id: generateUuidV4(),
      estateId,
      kind: addingKind,
      title: title.trim() || undefined,
      enabled: true,
      createdAt: now,
    };

    let row: EstateAvailabilityRule;

    if (addingKind === 'blackout') {
      if (!ISO_DATE.test(from) || !ISO_DATE.test(to)) {
        Alert.alert('Invalid dates', 'Use YYYY-MM-DD for start and end.');
        return;
      }
      if (from > to) {
        Alert.alert('Invalid range', 'Start date must be on or before end date.');
        return;
      }
      row = { ...base, kind: 'blackout', from, to };
    } else if (addingKind === 'annual_closure') {
      if (!MM_DD.test(annualFrom) || !MM_DD.test(annualTo)) {
        Alert.alert('Invalid season', 'Use MM-DD for both boundaries (e.g. 11-15 and 03-15).');
        return;
      }
      row = { ...base, kind: 'annual_closure', annualFrom, annualTo };
    } else if (addingKind === 'min_nights') {
      const n = parseInt(minNightsStr, 10);
      if (!Number.isFinite(n) || n < 1) {
        Alert.alert('Invalid value', 'Enter a minimum number of nights (1 or more).');
        return;
      }
      row = { ...base, kind: 'min_nights', minNights: n };
    } else {
      const n = parseInt(maxAdvanceStr, 10);
      if (!Number.isFinite(n) || n < 1) {
        Alert.alert('Invalid value', 'Enter how many days ahead guests may book (1 or more).');
        return;
      }
      row = { ...base, kind: 'max_advance_days', maxAdvanceDays: n };
    }

    const { error } = await addRule(row);
    if (error) {
      Alert.alert('Could not save', error);
      return;
    }
    resetForm();
  }

  function confirmDelete(r: EstateAvailabilityRule) {
    Alert.alert('Delete rule', 'Remove this rule?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteRule(r.id) },
    ]);
  }

  function renderRuleRow(r: EstateAvailabilityRule) {
    return (
      <View
        key={r.id}
        style={[styles.row, { borderColor: colors.icon + '22', backgroundColor: colors.surface }]}
      >
        <View style={styles.rowMain}>
          <ThemedText type="defaultSemiBold">{kindLabel(r.kind)}</ThemedText>
          {r.title ? (
            <ThemedText style={[styles.rowTitle, { color: colors.icon }]} numberOfLines={2}>
              {r.title}
            </ThemedText>
          ) : null}
          <ThemedText style={[styles.rowSub, { color: colors.icon }]}>{describeRule(r)}</ThemedText>
        </View>
        <Switch
          value={r.enabled}
          onValueChange={(v) => void updateRule(r.id, { enabled: v })}
          trackColor={{ false: colors.icon + '33', true: colors.tint + '88' }}
          thumbColor={r.enabled ? colors.tint : colors.icon}
        />
        <TouchableOpacity onPress={() => confirmDelete(r)} style={styles.trash} hitSlop={8}>
          <IconSymbol name="trash" size={18} color={colors.icon} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>
          {t('titles.availability')}
        </ThemedText>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.info, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '33' }]}>
          <IconSymbol name="info.circle.fill" size={18} color={colors.tint} />
          <ThemedText style={[styles.infoText, { color: colors.text }]}>
            {t('availabilityScreen.infoCalendar')}
          </ThemedText>
        </View>

        <SectionHeader title={`Calendar blocks · ${blocking.length}`} />
        {blocking.length === 0 ? (
          <ThemedText style={[styles.empty, { color: colors.icon }]}>No blackout or seasonal rules yet.</ThemedText>
        ) : (
          blocking.map(renderRuleRow)
        )}

        <SectionHeader title={`Booking limits · ${limits.length}`} />
        {limits.length === 0 ? (
          <ThemedText style={[styles.empty, { color: colors.icon }]}>No minimum stay or advance limits yet.</ThemedText>
        ) : (
          limits.map(renderRuleRow)
        )}

        <SectionHeader title="Add rule" />
        <View style={styles.addChips}>
          {(
            [
              'blackout',
              'annual_closure',
              'min_nights',
              'max_advance_days',
            ] as AvailabilityRuleKind[]
          ).map((k) => (
            <TouchableOpacity
              key={k}
              style={[
                styles.chip,
                { borderColor: addingKind === k ? colors.tint : colors.icon + '44', backgroundColor: colors.background },
              ]}
              onPress={() => startAdd(k)}
              activeOpacity={0.75}
            >
              <ThemedText style={[styles.chipText, addingKind === k && { color: colors.tint, fontWeight: '600' }]}>
                {kindLabel(k)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {addingKind && (
          <View style={[styles.form, { borderColor: colors.icon + '33' }]}>
            <ThemedText type="defaultSemiBold" style={styles.formTitle}>
              New {kindLabel(addingKind).toLowerCase()}
            </ThemedText>
            <FocusInput
              label="Label (optional)"
              placeholder="e.g. Winter maintenance"
              value={title}
              onChangeText={setTitle}
            />
            {addingKind === 'blackout' && (
              <>
                <FocusInput label="From (YYYY-MM-DD)" placeholder="2026-06-01" value={from} onChangeText={setFrom} />
                <FocusInput label="To (YYYY-MM-DD)" placeholder="2026-06-14" value={to} onChangeText={setTo} />
              </>
            )}
            {addingKind === 'annual_closure' && (
              <>
                <FocusInput label="From (MM-DD)" placeholder="11-15" value={annualFrom} onChangeText={setAnnualFrom} />
                <FocusInput label="To (MM-DD)" placeholder="03-15" value={annualTo} onChangeText={setAnnualTo} />
                <ThemedText style={[styles.hint, { color: colors.icon }]}>
                  Spans New Year when start is after end (e.g. November through March).
                </ThemedText>
              </>
            )}
            {addingKind === 'min_nights' && (
              <FocusInput
                label="Minimum nights"
                placeholder="3"
                value={minNightsStr}
                onChangeText={setMinNightsStr}
                keyboardType="number-pad"
              />
            )}
            {addingKind === 'max_advance_days' && (
              <>
                <FocusInput
                  label="Days ahead"
                  placeholder="90"
                  value={maxAdvanceStr}
                  onChangeText={setMaxAdvanceStr}
                  keyboardType="number-pad"
                />
                <ThemedText style={[styles.hint, { color: colors.icon }]}>
                  Check-in date must fall within this many days from today.
                </ThemedText>
              </>
            )}
            <View style={styles.formActions}>
              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.icon + '44' }]} onPress={resetForm}>
                <ThemedText style={{ color: colors.icon, fontWeight: '600' }}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.tint }]}
                onPress={() => void saveNew()}
                activeOpacity={0.85}
              >
                <ThemedText style={styles.primaryBtnText}>Save</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 24, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, gap: 12, paddingTop: 4 },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19 },
  empty: { fontSize: 14, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 13 },
  rowSub: { fontSize: 12 },
  trash: { padding: 6 },
  addChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  chipText: { fontSize: 13 },
  form: { gap: 14, padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 4 },
  formTitle: { fontSize: 16 },
  hint: { fontSize: 12, lineHeight: 17, marginTop: -6 },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  secondaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  primaryBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
