import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { DateRangePicker } from '@/components/ui/date-range-picker';
import { ThemedText } from '@/components/themed-text';
import {
  FilledButton,
  ScreenScroll,
  ScreenShell,
  SectionLabel,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { GuestCountRow, MIN_GUEST_COUNT } from '@/components/stays/guest-count-row';
import { EstateColors } from '@/constants/theme';
import { acceptedInvitedEstateIds } from '@/lib/accepted-invited-estates';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useStayStore } from '@/store/stay-store';
import { useAvailabilityRuleStore } from '@/store/availability-rule-store';
import {
  effectiveMaxAdvanceDays,
  violatesMaxAdvance,
} from '@/lib/availability-rule-blocking';
import { formatDateRange, nightCount } from '@/lib/date-utils';
import { generateUuidV4 } from '@/lib/id';

function paramString(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return '';
}

export default function GuestPlanStay() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ estateId?: string | string[] }>();
  const paramEstateId = paramString(params.estateId);
  const { colors } = useScreenTheme();
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const allInvitations = useInvitationStore((s) => s.invitations);
  const { requestStay, getBlockedRanges, hasConflict } = useStayStore();
  const availabilityRules = useAvailabilityRuleStore((s) => s.rules);

  const acceptedEstateIds = useMemo(
    () => acceptedInvitedEstateIds(allInvitations, currentUser?.id, currentUser?.email),
    [allInvitations, currentUser?.email, currentUser?.id]
  );

  const acceptedEstates = useMemo(
    () => allEstates.filter((e) => acceptedEstateIds.includes(e.id)),
    [allEstates, acceptedEstateIds]
  );

  const paramLocked =
    !!paramEstateId && acceptedEstateIds.includes(paramEstateId);

  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(() => {
    if (paramEstateId && acceptedEstateIds.includes(paramEstateId)) return paramEstateId;
    return acceptedEstates.length === 1 ? acceptedEstates[0].id : null;
  });
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState(MIN_GUEST_COUNT);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (paramLocked) {
      setSelectedEstateId(paramEstateId);
      return;
    }
    if (selectedEstateId && !acceptedEstateIds.includes(selectedEstateId)) {
      setSelectedEstateId(acceptedEstates.length === 1 ? acceptedEstates[0].id : null);
    } else if (!selectedEstateId && acceptedEstates.length === 1) {
      setSelectedEstateId(acceptedEstates[0].id);
    }
  }, [paramLocked, paramEstateId, acceptedEstateIds, acceptedEstates, selectedEstateId]);

  const blockedRanges = selectedEstateId ? getBlockedRanges(selectedEstateId) : [];
  const effMaxAdvance =
    selectedEstateId != null ? effectiveMaxAdvanceDays(availabilityRules, selectedEstateId) : undefined;
  const conflictWarning =
    selectedEstateId && from && to ? hasConflict(selectedEstateId, from, to) : false;
  const maxAdvanceBreak = Boolean(
    selectedEstateId && from && violatesMaxAdvance(availabilityRules, selectedEstateId, from)
  );
  const limitHint =
    maxAdvanceBreak && effMaxAdvance != null
      ? t('blockDates.bookingWindowDays', { count: effMaxAdvance })
      : '';

  function pickEstate(id: string) {
    setSelectedEstateId(id);
    setFrom(null);
    setTo(null);
  }

  async function submit() {
    if (!selectedEstateId || !from || !to) return;
    if (maxAdvanceBreak) {
      Alert.alert(
        t('blockDates.bookingWindowTitle'),
        effMaxAdvance != null
          ? t('blockDates.bookingWindowDays', { count: effMaxAdvance })
          : t('blockDates.bookingWindowGeneric')
      );
      return;
    }
    const { error } = await requestStay({
      id: generateUuidV4(),
      estateId: selectedEstateId,
      guestId: currentUser!.id,
      requestedFrom: from,
      requestedTo: to,
      guestCount,
      status: 'pending',
      guestNote: note.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (error) {
      Alert.alert(t('requestDates.sendFailed'), error);
      return;
    }
    Alert.alert(t('requestDates.sentTitle'), t('requestDates.sentBody'));
    router.back();
  }

  const canSubmit =
    !!selectedEstateId && !!from && !!to && !maxAdvanceBreak;

  return (
    <ScreenShell title={t('titles.requestDates')}>
      <ScreenScroll gap={24} contentContainerStyle={styles.scroll}>
        <View style={styles.section}>
          <SectionLabel>{t('requestDates.property')}</SectionLabel>
          <View style={styles.pillRow}>
            {(paramLocked
              ? acceptedEstates.filter((e) => e.id === paramEstateId)
              : acceptedEstates
            ).map((e, i) => {
              const selected = e.id === selectedEstateId;
              const dotColor = EstateColors[i % EstateColors.length];
              return (
                <TouchableOpacity
                  key={e.id}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: selected ? dotColor + '22' : colors.background,
                      borderColor: selected ? dotColor : colors.icon + '33',
                    },
                  ]}
                  onPress={() => {
                    if (paramLocked) return;
                    pickEstate(e.id);
                  }}
                  activeOpacity={paramLocked ? 1 : 0.75}
                >
                  <View style={[styles.dot, { backgroundColor: dotColor }]} />
                  <ThemedText style={[styles.pillText, selected && { color: dotColor, fontWeight: '600' }]}>
                    {e.name}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {selectedEstateId && (
          <View style={styles.section}>
            <SectionLabel>{t('requestDates.dates')}</SectionLabel>
            <View style={[styles.pickerWrap, { borderColor: colors.icon + '33', backgroundColor: colors.background }]}>
              <DateRangePicker
                from={from}
                to={to}
                blockedRanges={blockedRanges}
                onChange={(f, t) => { setFrom(f); setTo(t); }}
              />
            </View>
            {from && to && (
              <View style={[styles.summary, { backgroundColor: colors.tint + '11', borderColor: colors.tint + '33' }]}>
                <ThemedText type="defaultSemiBold">{formatDateRange(from, to)}</ThemedText>
                <ThemedText style={{ color: colors.icon }}>{t('common.nights', { count: nightCount(from, to) })}</ThemedText>
              </View>
            )}
            {conflictWarning && (
              <View style={[styles.warnBanner, { backgroundColor: colors.warning + '18', borderColor: colors.warning + '55' }]}>
                <ThemedText style={[styles.warnText, { color: colors.warning }]}>
                  {t('requestDates.conflictStillSend')}
                </ThemedText>
              </View>
            )}
            {maxAdvanceBreak && limitHint.length > 0 && (
              <View style={[styles.warnBanner, { backgroundColor: colors.warning + '18', borderColor: colors.warning + '55' }]}>
                <ThemedText style={[styles.warnText, { color: colors.warning }]}>{limitHint}</ThemedText>
              </View>
            )}
          </View>
        )}

        {selectedEstateId && (
          <View style={styles.section}>
            <GuestCountRow value={guestCount} onChange={setGuestCount} />
          </View>
        )}

        {selectedEstateId && (
          <View style={styles.section}>
            <SectionLabel>{t('requestDates.noteLabel')}</SectionLabel>
            <TextInput
              style={[styles.noteInput, { color: colors.text, borderColor: colors.icon + '44' }]}
              placeholder={t('requestDates.notePlaceholder')}
              placeholderTextColor={colors.icon}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        )}

        <FilledButton
          label="Send Request"
          icon="calendar.badge.plus"
          onPress={() => void submit()}
          disabled={!canSubmit}
        />
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 4 },
  section: { gap: 10 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontSize: 14 },
  pickerWrap: { padding: 16, borderRadius: 16, borderWidth: 1 },
  summary: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
  warnBanner: { padding: 12, borderRadius: 12, borderWidth: 1 },
  warnText: { fontSize: 13, lineHeight: 18 },
  noteInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, height: 80, paddingTop: 12 },
});
