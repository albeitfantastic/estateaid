import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { DateRangePicker } from '@/components/ui/date-range-picker';
import { EmptyState } from '@/components/ui/empty-state';
import { FocusInput } from '@/components/ui/focus-input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Elevation, Layout, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDateRange } from '@/lib/date-utils';
import { generateUuidV4 } from '@/lib/id';
import { useCan } from '@/lib/entitlements/capabilities';
import { openHostCapabilityDenied } from '@/lib/entitlements/host-gate';
import { effectiveMaxAdvanceDays } from '@/lib/availability-rule-blocking';
import { useAvailabilityRuleStore } from '@/store/availability-rule-store';
import type { EstateAvailabilityRule } from '@/types/availability-rule';

const DEFAULT_ADVANCE_DAYS = 90;
const MIN_ADVANCE_DAYS = 1;
const MAX_ADVANCE_DAYS = 365;

type Props = {
  estateId: string;
};

export function AvailabilityRulesScreen({ estateId }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? 'light';
  const colors = Colors[scheme];
  const cardShadow = Elevation.card[scheme];

  const { rules, addRule, updateRule, deleteRule, fetchFromSupabase } = useAvailabilityRuleStore();
  const canWrite = useCan()('availability.write', { estateId });

  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<EstateAvailabilityRule | null>(null);
  const [title, setTitle] = useState('');
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);

  useEffect(() => {
    void fetchFromSupabase();
  }, [fetchFromSupabase]);

  const blackouts = useMemo(
    () =>
      rules
        .filter((r) => r.estateId === estateId && r.kind === 'blackout')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [rules, estateId]
  );

  const maxAdvanceRules = useMemo(
    () => rules.filter((r) => r.estateId === estateId && r.kind === 'max_advance_days'),
    [rules, estateId]
  );

  const advanceDays = effectiveMaxAdvanceDays(rules, estateId);
  const advanceLimitEnabled = advanceDays != null;

  function requireWrite(action: () => void) {
    if (!canWrite) {
      openHostCapabilityDenied(estateId, 'availability.write', `/(app)/estates/${estateId}/availability`);
      return;
    }
    action();
  }

  function openAddSheet() {
    requireWrite(() => {
      setEditingRule(null);
      setTitle('');
      setFrom(null);
      setTo(null);
      setSheetVisible(true);
    });
  }

  function openEditSheet(rule: EstateAvailabilityRule) {
    requireWrite(() => {
      setEditingRule(rule);
      setTitle(rule.title ?? '');
      setFrom(rule.from ?? null);
      setTo(rule.to ?? null);
      setSheetVisible(true);
    });
  }

  function closeSheet() {
    setSheetVisible(false);
    setEditingRule(null);
  }

  async function saveBlackout() {
    if (!from || !to) {
      Alert.alert(t('availabilityScreen.invalidDates'));
      return;
    }
    if (from > to) {
      Alert.alert(t('availabilityScreen.invalidRange'));
      return;
    }

    if (editingRule) {
      await updateRule(editingRule.id, {
        title: title.trim() || undefined,
        from,
        to,
      });
    } else {
      const now = new Date().toISOString();
      const { error } = await addRule({
        id: generateUuidV4(),
        estateId,
        kind: 'blackout',
        title: title.trim() || undefined,
        from,
        to,
        enabled: true,
        createdAt: now,
      });
      if (error) {
        Alert.alert(t('availabilityScreen.couldNotSave'), error);
        return;
      }
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeSheet();
  }

  function confirmDeleteBlackout(rule: EstateAvailabilityRule) {
    Alert.alert(t('availabilityScreen.deleteRule'), t('availabilityScreen.deleteRuleConfirm'), [
      { text: t('availabilityScreen.cancel'), style: 'cancel' },
      {
        text: t('availabilityScreen.deleteRule'),
        style: 'destructive',
        onPress: () => {
          void deleteRule(rule.id);
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      },
    ]);
  }

  async function setAdvanceLimitEnabled(enabled: boolean) {
    if (!canWrite) {
      openHostCapabilityDenied(estateId, 'availability.write', `/(app)/estates/${estateId}/availability`);
      return;
    }

    if (!enabled) {
      for (const r of maxAdvanceRules) {
        await deleteRule(r.id);
      }
      void Haptics.selectionAsync();
      return;
    }

    if (maxAdvanceRules.length === 0) {
      const now = new Date().toISOString();
      const { error } = await addRule({
        id: generateUuidV4(),
        estateId,
        kind: 'max_advance_days',
        maxAdvanceDays: DEFAULT_ADVANCE_DAYS,
        enabled: true,
        createdAt: now,
      });
      if (error) Alert.alert(t('availabilityScreen.couldNotSave'), error);
    }
    void Haptics.selectionAsync();
  }

  async function changeAdvanceDays(delta: number) {
    if (!canWrite) {
      openHostCapabilityDenied(estateId, 'availability.write', `/(app)/estates/${estateId}/availability`);
      return;
    }

    const current = advanceDays ?? DEFAULT_ADVANCE_DAYS;
    const next = Math.min(MAX_ADVANCE_DAYS, Math.max(MIN_ADVANCE_DAYS, current + delta));
    const primary = maxAdvanceRules.find((r) => r.enabled) ?? maxAdvanceRules[0];

    if (primary) {
      await updateRule(primary.id, { maxAdvanceDays: next, enabled: true });
      for (const r of maxAdvanceRules) {
        if (r.id !== primary.id) await deleteRule(r.id);
      }
    } else {
      const now = new Date().toISOString();
      await addRule({
        id: generateUuidV4(),
        estateId,
        kind: 'max_advance_days',
        maxAdvanceDays: next,
        enabled: true,
        createdAt: now,
      });
    }
    void Haptics.selectionAsync();
  }

  function renderBlackoutRow(rule: EstateAvailabilityRule, isLast: boolean) {
    const range =
      rule.from && rule.to ? formatDateRange(rule.from, rule.to) : t('availabilityScreen.invalidDates');

    return (
      <TouchableOpacity
        key={rule.id}
        style={[styles.row, !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
        onPress={() => openEditSheet(rule)}
        activeOpacity={0.65}
        disabled={!canWrite}
      >
        <View style={[styles.rowIcon, { backgroundColor: colors.tint + '12' }]}>
          <IconSymbol name="calendar.badge.minus" size={18} color={colors.tint} />
        </View>
        <View style={styles.rowBody}>
          <ThemedText type="defaultSemiBold" style={styles.rowTitle}>
            {rule.title?.trim() || range}
          </ThemedText>
          {rule.title?.trim() ? (
            <ThemedText style={[styles.rowSub, { color: colors.textSecondary }]}>{range}</ThemedText>
          ) : null}
        </View>
        <Switch
          value={rule.enabled}
          onValueChange={(v) => void updateRule(rule.id, { enabled: v })}
          trackColor={{ false: colors.border, true: colors.tint + '88' }}
          thumbColor="#fff"
        />
        <TouchableOpacity
          onPress={() => confirmDeleteBlackout(rule)}
          hitSlop={8}
          style={styles.trashBtn}
          disabled={!canWrite}
        >
          <IconSymbol name="trash" size={17} color={colors.error} />
        </TouchableOpacity>
      </TouchableOpacity>
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
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={[styles.footnote, { color: colors.textSecondary }]}>
          {t('availabilityScreen.infoCalendar')}
        </ThemedText>

        <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t('availabilityScreen.sectionBlocked').toUpperCase()}
        </ThemedText>

        {blackouts.length === 0 ? (
          <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
            <EmptyState
              icon="calendar.badge.minus"
              title={t('availabilityScreen.blockedEmptyTitle')}
              subtitle={t('availabilityScreen.blockedEmptySub')}
              actionLabel={canWrite ? t('availabilityScreen.addBlockedDates') : undefined}
              onAction={canWrite ? openAddSheet : undefined}
            />
          </View>
        ) : (
          <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
            {blackouts.map((r, i) => renderBlackoutRow(r, i === blackouts.length - 1))}
          </View>
        )}

        {blackouts.length > 0 && (
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: colors.tint }]}
            onPress={openAddSheet}
            activeOpacity={0.8}
          >
            <IconSymbol name="plus" size={18} color={colors.tint} />
            <ThemedText style={[styles.addBtnText, { color: colors.tint }]}>
              {t('availabilityScreen.addBlockedDates')}
            </ThemedText>
          </TouchableOpacity>
        )}

        <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: Layout.sectionGap }]}>
          {t('availabilityScreen.sectionBookingWindow').toUpperCase()}
        </ThemedText>

        <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
          <View style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.tint + '12' }]}>
              <IconSymbol name="clock.badge.checkmark" size={18} color={colors.tint} />
            </View>
            <ThemedText style={[styles.rowTitle, { flex: 1 }]}>
              {t('availabilityScreen.limitAdvanceBooking')}
            </ThemedText>
            <Switch
              value={advanceLimitEnabled}
              onValueChange={(v) => void setAdvanceLimitEnabled(v)}
              trackColor={{ false: colors.border, true: colors.tint + '88' }}
              thumbColor="#fff"
            />
          </View>

          {advanceLimitEnabled ? (
            <View style={styles.stepperRow}>
              <ThemedText style={[styles.stepperLabel, { color: colors.textSecondary }]}>
                {t('availabilityScreen.guestsCanBookUpTo')}
              </ThemedText>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: colors.tintMuted }]}
                  onPress={() => void changeAdvanceDays(-1)}
                  disabled={!canWrite || (advanceDays ?? DEFAULT_ADVANCE_DAYS) <= MIN_ADVANCE_DAYS}
                  activeOpacity={0.7}
                >
                  <IconSymbol name="minus" size={16} color={colors.tint} />
                </TouchableOpacity>
                <ThemedText type="defaultSemiBold" style={styles.stepperValue}>
                  {advanceDays ?? DEFAULT_ADVANCE_DAYS}
                </ThemedText>
                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: colors.tintMuted }]}
                  onPress={() => void changeAdvanceDays(1)}
                  disabled={!canWrite || (advanceDays ?? DEFAULT_ADVANCE_DAYS) >= MAX_ADVANCE_DAYS}
                  activeOpacity={0.7}
                >
                  <IconSymbol name="plus" size={16} color={colors.tint} />
                </TouchableOpacity>
                <ThemedText style={[styles.stepperUnit, { color: colors.textSecondary }]}>
                  {t('availabilityScreen.daysAhead')}
                </ThemedText>
              </View>
              <ThemedText style={[styles.hint, { color: colors.textSecondary }]}>
                {t('availabilityScreen.bookingWindowFootnote')}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.stepperRow}>
              <ThemedText style={[styles.hint, { color: colors.textSecondary }]}>
                {t('availabilityScreen.noBookingLimit')}
              </ThemedText>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={sheetVisible}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        onRequestClose={closeSheet}
      >
        <ThemedView style={[styles.sheet, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHeader}>
            <TouchableOpacity onPress={closeSheet} hitSlop={8}>
              <ThemedText style={[styles.sheetHeaderBtn, { color: colors.tint }]}>
                {t('availabilityScreen.cancel')}
              </ThemedText>
            </TouchableOpacity>
            <ThemedText type="defaultSemiBold" style={styles.sheetTitle}>
              {editingRule ? t('availabilityScreen.editBlockedDates') : t('availabilityScreen.addBlockedDates')}
            </ThemedText>
            <TouchableOpacity onPress={() => void saveBlackout()} hitSlop={8}>
              <ThemedText style={[styles.sheetHeaderBtn, { color: colors.tint, fontWeight: '700' }]}>
                {t('availabilityScreen.save')}
              </ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
            <FocusInput
              label={t('availabilityScreen.labelOptional')}
              placeholder={t('availabilityScreen.labelPlaceholder')}
              value={title}
              onChangeText={setTitle}
            />
            <View style={[styles.pickerWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <DateRangePicker from={from} to={to} onChange={(f, tVal) => { setFrom(f); setTo(tVal); }} />
            </View>
          </ScrollView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Layout.screenPaddingX, paddingBottom: 16, gap: 12 },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 28, fontWeight: '700' },
  scroll: { paddingHorizontal: Layout.screenPaddingX, gap: 10 },
  footnote: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  sectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, marginBottom: 6 },
  groupCard: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: Layout.touchMin,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16 },
  rowSub: { fontSize: 13 },
  trashBtn: { padding: 4 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    marginTop: 4,
  },
  addBtnText: { fontSize: 15, fontWeight: '600' },
  stepperRow: { paddingHorizontal: 14, paddingVertical: 14, gap: 10 },
  stepperLabel: { fontSize: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { fontSize: 22, minWidth: 36, textAlign: 'center' },
  stepperUnit: { fontSize: 15, flex: 1 },
  hint: { fontSize: 13, lineHeight: 18 },
  sheet: { flex: 1 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPaddingX,
    paddingBottom: 12,
  },
  sheetTitle: { fontSize: 17 },
  sheetHeaderBtn: { fontSize: 16, minWidth: 64 },
  sheetBody: { paddingHorizontal: Layout.screenPaddingX, gap: 16, paddingTop: 8 },
  pickerWrap: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: 12, overflow: 'hidden' },
});
