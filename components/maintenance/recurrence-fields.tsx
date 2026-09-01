import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { FocusInput } from '@/components/ui/focus-input';
import { DueDatePickerModal } from '@/components/ui/due-date-picker-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SelectField } from '@/components/ui/select-field';
import { useScreenTheme } from '@/components/ui/screen-layout';
import { Radius } from '@/constants/theme';
import { formatDate } from '@/lib/date-utils';
import { RECURRENCE_FREQUENCIES, usesDayOfMonth } from '@/lib/event-utils';
import { typography } from '@/theme';
import type { RecurrenceFrequency } from '@/types';

const LEAD_OPTIONS = [0, 1, 3, 7, 14, 30];
const DAY_OF_MONTH_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

export type RecurrenceUiFrequency = RecurrenceFrequency | 'once';

const FREQ_I18N: Record<RecurrenceUiFrequency, string> = {
  once: 'recurrence.once',
  daily: 'recurrence.daily',
  weekly: 'recurrence.weekly',
  biweekly: 'recurrence.biweekly',
  monthly: 'recurrence.monthly',
  quarterly: 'recurrence.quarterly',
  semi_annual: 'recurrence.semiAnnual',
  yearly: 'recurrence.yearly',
  custom: 'recurrence.custom',
};

export type RecurrenceFieldsValue = {
  frequency: RecurrenceUiFrequency;
  dayOfWeek: number;
  dayOfMonth: number;
  intervalMonths: number;
  reminderLeadDays: number;
  onceDate: string;
};

type Props = {
  value: RecurrenceFieldsValue;
  onChange: (next: RecurrenceFieldsValue) => void;
  showFrequency?: boolean;
};

export function RecurrenceFields({ value, onChange, showFrequency = true }: Props) {
  const { t } = useTranslation();
  const { colors } = useScreenTheme();
  const { frequency, dayOfWeek, dayOfMonth, intervalMonths, reminderLeadDays, onceDate } = value;
  const dayNames = t('recurrence.weekdays', { returnObjects: true }) as string[];
  const isOnce = frequency === 'once';
  const [dateOpen, setDateOpen] = useState(false);

  function patch(partial: Partial<RecurrenceFieldsValue>) {
    onChange({ ...value, ...partial });
  }

  const freqOptions: { value: RecurrenceUiFrequency; label: string }[] = [
    { value: 'once', label: t(FREQ_I18N.once) },
    ...RECURRENCE_FREQUENCIES.map((opt) => ({
      value: opt,
      label: t(FREQ_I18N[opt]),
    })),
  ];
  const dayOfMonthOptions = DAY_OF_MONTH_OPTIONS.map((d) => ({ value: d, label: String(d) }));
  const reminderOptions = LEAD_OPTIONS.map((d) => ({
    value: d,
    label: d === 0 ? t('recurrence.reminderOnDay') : t('recurrence.reminderLead', { count: d }),
  }));
  if (!LEAD_OPTIONS.includes(reminderLeadDays)) {
    reminderOptions.push({
      value: reminderLeadDays,
      label: t('recurrence.reminderLead', { count: reminderLeadDays }),
    });
    reminderOptions.sort((a, b) => a.value - b.value);
  }

  return (
    <>
      {showFrequency ? (
        <>
          <SelectField
            label={t('recurrence.frequency')}
            value={frequency}
            options={freqOptions}
            onChange={(next) => patch({ frequency: next })}
          />

          {isOnce ? (
            <View style={styles.field}>
              <ThemedText style={[styles.label, { color: colors.icon }]}>
                {t('recurrence.onceDate')}
              </ThemedText>
              <TouchableOpacity
                style={[styles.dateTrigger, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={() => setDateOpen(true)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`${t('recurrence.onceDate')}, ${onceDate ? formatDate(onceDate) : t('ticketsHub.newTicketPickDue')}`}
              >
                <ThemedText style={[styles.dateTriggerText, { color: colors.text }]} numberOfLines={1}>
                  {onceDate ? formatDate(onceDate) : t('ticketsHub.newTicketPickDue')}
                </ThemedText>
                <IconSymbol name="chevron.down" size={18} color={colors.iconMuted} />
              </TouchableOpacity>
              <DueDatePickerModal
                visible={dateOpen}
                onClose={() => setDateOpen(false)}
                onSelectDate={(d) => {
                  patch({ onceDate: d });
                  setDateOpen(false);
                }}
                title={t('recurrence.onceDate')}
                includePastDays={365}
                selectedDate={onceDate || undefined}
              />
            </View>
          ) : null}

          {!isOnce && (frequency === 'weekly' || frequency === 'biweekly') ? (
            <View style={styles.field}>
              <ThemedText style={[styles.label, { color: colors.icon }]}>
                {t('recurrence.dayOfWeek')}
              </ThemedText>
              <View style={styles.dayRow}>
                {dayNames.map((name, i) => {
                  const on = dayOfWeek === i;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.dayBtn,
                        { borderColor: colors.tint + '44' },
                        on && { backgroundColor: colors.tint, borderColor: colors.tint },
                      ]}
                      onPress={() => patch({ dayOfWeek: i })}
                      activeOpacity={0.8}
                    >
                      <ThemedText
                        style={[styles.dayBtnText, { color: on ? colors.textOnBrand : colors.text }]}
                      >
                        {name}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}

          {!isOnce && usesDayOfMonth(frequency) && frequency !== 'custom' ? (
            <SelectField
              label={t('recurrence.dayOfMonth')}
              value={dayOfMonth}
              options={dayOfMonthOptions}
              onChange={(next) => patch({ dayOfMonth: next })}
            />
          ) : null}

          {!isOnce && frequency === 'custom' ? (
            <FocusInput
              label={t('recurrence.intervalMonths')}
              value={String(intervalMonths)}
              onChangeText={(v) => {
                const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
                patch({ intervalMonths: Number.isFinite(n) && n > 0 ? n : 1 });
              }}
              keyboardType="number-pad"
            />
          ) : null}
        </>
      ) : null}

      <SelectField
        label={t('recurrence.reminder')}
        value={reminderLeadDays}
        options={reminderOptions}
        onChange={(next) => patch({ reminderLeadDays: next })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: typography.fontFamily.bold,
  },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayBtn: {
    minWidth: 40,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  dayBtnText: { fontSize: 13, fontWeight: '600' },
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
