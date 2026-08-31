import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { DateRangePicker } from '@/components/ui/date-range-picker';
import { EmptyState } from '@/components/ui/empty-state';
import { FocusInput } from '@/components/ui/focus-input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  FormSheet,
  GroupedFormSection,
  GroupedList,
  GroupedRow,
  OutlineButton,
  ScreenFootnote,
  ScreenScroll,
  ScreenShell,
  SectionLabel,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { Layout } from '@/constants/theme';
import { formatDateRange } from '@/lib/date-utils';
import { generateUuidV4 } from '@/lib/id';
import { useCan } from '@/lib/entitlements/capabilities';
import { openHostCapabilityDenied } from '@/lib/entitlements/host-gate';
import { effectiveMaxAdvanceDays } from '@/lib/availability-rule-blocking';
import { useAvailabilityRuleStore } from '@/store/availability-rule-store';
import type { EstateAvailabilityRule } from '@/types/availability-rule';
import { ThemedText } from '@/components/themed-text';

const DEFAULT_ADVANCE_DAYS = 90;
const MIN_ADVANCE_DAYS = 1;
const MAX_ADVANCE_DAYS = 365;

type Props = {
  estateId: string;
};

export function AvailabilityRulesScreen({ estateId }: Props) {
  const { t } = useTranslation();
  const { colors } = useScreenTheme();
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

  function blackoutTrailing(rule: EstateAvailabilityRule) {
    return (
      <View style={styles.trailingCluster}>
        <Switch
          value={rule.enabled}
          onValueChange={(v) => void updateRule(rule.id, { enabled: v })}
          trackColor={{ false: colors.border, true: colors.tint + '88' }}
          thumbColor={colors.textOnBrand}
        />
        <TouchableOpacity
          onPress={() => confirmDeleteBlackout(rule)}
          hitSlop={8}
          disabled={!canWrite}
        >
          <IconSymbol name="trash" size={17} color={colors.error} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScreenShell title={t('titles.availability')}>
      <ScreenScroll>
        <ScreenFootnote>{t('availabilityScreen.infoCalendar')}</ScreenFootnote>

        <SectionLabel>{t('availabilityScreen.sectionBlocked')}</SectionLabel>

        {blackouts.length === 0 ? (
          <GroupedList>
            <EmptyState
              icon="calendar.badge.minus"
              title={t('availabilityScreen.blockedEmptyTitle')}
              subtitle={t('availabilityScreen.blockedEmptySub')}
              actionLabel={canWrite ? t('availabilityScreen.addBlockedDates') : undefined}
              onAction={canWrite ? openAddSheet : undefined}
            />
          </GroupedList>
        ) : (
          <GroupedList>
            {blackouts.map((rule, i) => {
              const range =
                rule.from && rule.to
                  ? formatDateRange(rule.from, rule.to)
                  : t('availabilityScreen.invalidDates');
              return (
                <GroupedRow
                  key={rule.id}
                  icon="calendar.badge.minus"
                  title={rule.title?.trim() || range}
                  subtitle={rule.title?.trim() ? range : undefined}
                  trailing={blackoutTrailing(rule)}
                  onPress={() => openEditSheet(rule)}
                  isLast={i === blackouts.length - 1}
                  disabled={!canWrite}
                />
              );
            })}
          </GroupedList>
        )}

        {blackouts.length > 0 && (
          <OutlineButton
            label={t('availabilityScreen.addBlockedDates')}
            icon="plus"
            onPress={openAddSheet}
          />
        )}

        <SectionLabel marginTop={Layout.sectionGap}>
          {t('availabilityScreen.sectionBookingWindow')}
        </SectionLabel>

        <GroupedList>
          <GroupedRow
            icon="clock.badge.checkmark"
            title={t('availabilityScreen.limitAdvanceBooking')}
            trailing={
              <Switch
                value={advanceLimitEnabled}
                onValueChange={(v) => void setAdvanceLimitEnabled(v)}
                trackColor={{ false: colors.border, true: colors.tint + '88' }}
                thumbColor={colors.textOnBrand}
              />
            }
            isLast={!advanceLimitEnabled}
          />

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
        </GroupedList>
      </ScreenScroll>

      <FormSheet
        visible={sheetVisible}
        title={
          editingRule ? t('availabilityScreen.editBlockedDates') : t('availabilityScreen.addBlockedDates')
        }
        cancelLabel={t('availabilityScreen.cancel')}
        saveLabel={t('availabilityScreen.save')}
        onClose={closeSheet}
        onSave={() => void saveBlackout()}
      >
        <FocusInput
          label={t('availabilityScreen.labelOptional')}
          placeholder={t('availabilityScreen.labelPlaceholder')}
          value={title}
          onChangeText={setTitle}
        />
        <GroupedFormSection>
          <DateRangePicker
            from={from}
            to={to}
            onChange={(f, tVal) => {
              setFrom(f);
              setTo(tVal);
            }}
          />
        </GroupedFormSection>
      </FormSheet>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  trailingCluster: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
});
