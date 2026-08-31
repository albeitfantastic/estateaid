import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { FocusInput } from '@/components/ui/focus-input';
import { SectionLabel, useScreenTheme } from '@/components/ui/screen-layout';
import { RECURRENCE_FREQUENCIES, usesDayOfMonth } from '@/lib/event-utils';
import type { RecurrenceFrequency } from '@/types';

const LEAD_OPTIONS = [0, 1, 3, 7, 14, 30];

const FREQ_I18N: Record<RecurrenceFrequency, string> = {
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
  frequency: RecurrenceFrequency;
  dayOfWeek: number;
  dayOfMonth: number;
  intervalMonths: number;
  reminderLeadDays: number;
};

type Props = {
  value: RecurrenceFieldsValue;
  onChange: (next: RecurrenceFieldsValue) => void;
  showFrequency?: boolean;
};

export function RecurrenceFields({ value, onChange, showFrequency = true }: Props) {
  const { t } = useTranslation();
  const { colors } = useScreenTheme();
  const { frequency, dayOfWeek, dayOfMonth, intervalMonths, reminderLeadDays } = value;
  const dayNames = t('recurrence.weekdays', { returnObjects: true }) as string[];

  function patch(partial: Partial<RecurrenceFieldsValue>) {
    onChange({ ...value, ...partial });
  }

  return (
    <>
      {showFrequency ? (
        <>
          <SectionLabel>{t('recurrence.frequency')}</SectionLabel>
          <View style={styles.freqRow}>
            {RECURRENCE_FREQUENCIES.map((opt) => {
              const on = frequency === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.freqBtn,
                    { borderColor: colors.tint + '44' },
                    on && { backgroundColor: colors.tint, borderColor: colors.tint },
                  ]}
                  onPress={() => patch({ frequency: opt })}
                  activeOpacity={0.8}
                >
                  <ThemedText
                    style={[styles.freqBtnText, { color: on ? colors.textOnBrand : colors.text }]}
                  >
                    {t(FREQ_I18N[opt])}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>

          {(frequency === 'weekly' || frequency === 'biweekly') && (
            <>
              <SectionLabel>{t('recurrence.dayOfWeek')}</SectionLabel>
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
            </>
          )}

          {usesDayOfMonth(frequency) && frequency !== 'custom' && (
            <>
              <SectionLabel>{t('recurrence.dayOfMonth')}</SectionLabel>
              <View style={styles.dayOfMonthRow}>
                {[1, 5, 10, 15, 20, 25].map((d) => {
                  const on = dayOfMonth === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.dayBtn,
                        { borderColor: colors.tint + '44' },
                        on && { backgroundColor: colors.tint, borderColor: colors.tint },
                      ]}
                      onPress={() => patch({ dayOfMonth: d })}
                      activeOpacity={0.8}
                    >
                      <ThemedText
                        style={[styles.dayBtnText, { color: on ? colors.textOnBrand : colors.text }]}
                      >
                        {d}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {frequency === 'custom' ? (
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

      <SectionLabel>{t('recurrence.reminder')}</SectionLabel>
      <View style={styles.freqRow}>
        {LEAD_OPTIONS.map((d) => {
          const on = reminderLeadDays === d;
          return (
            <TouchableOpacity
              key={d}
              style={[
                styles.freqBtn,
                { borderColor: colors.tint + '44' },
                on && { backgroundColor: colors.tint, borderColor: colors.tint },
              ]}
              onPress={() => patch({ reminderLeadDays: d })}
              activeOpacity={0.8}
            >
              <ThemedText
                style={[styles.freqBtnText, { color: on ? colors.textOnBrand : colors.text }]}
              >
                {d === 0 ? t('recurrence.reminderOnDay') : t('recurrence.reminderLead', { count: d })}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freqBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  freqBtnText: { fontSize: 13, fontWeight: '600' },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayOfMonthRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayBtn: {
    minWidth: 40,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  dayBtnText: { fontSize: 13, fontWeight: '600' },
});
