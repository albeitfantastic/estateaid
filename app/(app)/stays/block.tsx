import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { DateRangePicker } from '@/components/ui/date-range-picker';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import {
  FilledButton,
  GroupedList,
  GroupedRow,
  ScreenScroll,
  ScreenShell,
  SectionLabel,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { EstateColors } from '@/constants/theme';
import { useManagedEstates } from '@/lib/entitlements/capabilities';
import { useAuthStore } from '@/store/auth-store';
import { useInvitationStore } from '@/store/invitation-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
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

export default function BlockStay() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ estateId?: string | string[] }>();
  const paramEstateId = paramString(params.estateId);
  const { colors } = useScreenTheme();
  const currentUser = useAuthStore((s) => s.currentUser);
  const profileById = useProfileStore((s) => s.byId);
  const { createDirectStay, getBlockedRanges, hasConflict } = useStayStore();
  const availabilityRules = useAvailabilityRuleStore((s) => s.rules);
  const { getInvitationsByEstate } = useInvitationStore();

  /** Invited hosts block dates too (spec §3), so resolve the set through the shared selector. */
  const { estates } = useManagedEstates();

  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(() => {
    if (paramEstateId && estates.some((e) => e.id === paramEstateId)) return paramEstateId;
    return estates.length === 1 ? estates[0].id : null;
  });
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);

  const blockedRanges = selectedEstateId ? getBlockedRanges(selectedEstateId) : [];
  const effMaxAdvance =
    selectedEstateId != null ? effectiveMaxAdvanceDays(availabilityRules, selectedEstateId) : undefined;
  const maxAdvanceBreak = Boolean(
    selectedEstateId && from && violatesMaxAdvance(availabilityRules, selectedEstateId, from)
  );

  const guestOptions = useMemo(() => {
    const ownerEntry = currentUser
      ? [{ id: currentUser.id, name: t('blockDates.youSuffix', { name: currentUser.name }), email: currentUser.email }]
      : [];
    if (!selectedEstateId) return ownerEntry;
    const accepted = getInvitationsByEstate(selectedEstateId).filter(
      (inv) => inv.status === 'accepted' && inv.guestId
    );
    const guestIds = [...new Set(accepted.map((inv) => inv.guestId!))];
    const guests = guestIds.map((id) => {
      const inv = accepted.find((i) => i.guestId === id);
      return {
        id,
        name: resolveUserDisplayName(id, profileById, inv?.guestEmail),
        email: inv?.guestEmail ?? '',
      };
    });
    return [...ownerEntry, ...guests];
  }, [selectedEstateId, currentUser, getInvitationsByEstate, profileById, t]);

  function pickEstate(id: string) {
    setSelectedEstateId(id);
    setSelectedGuestIds([]);
    setFrom(null);
    setTo(null);
  }

  function toggleGuest(id: string) {
    setSelectedGuestIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  async function submit() {
    if (!selectedEstateId) { Alert.alert(t('common.required'), t('blockDates.requiredProperty')); return; }
    if (selectedGuestIds.length === 0) { Alert.alert(t('common.required'), t('blockDates.requiredGuest')); return; }
    if (!from || !to) { Alert.alert(t('common.required'), t('blockDates.requiredDates')); return; }
    if (hasConflict(selectedEstateId, from, to)) {
      Alert.alert(t('blockDates.datesUnavailable'), t('blockDates.datesUnavailable'));
      return;
    }
    if (maxAdvanceBreak) {
      Alert.alert(
        t('blockDates.bookingWindowTitle'),
        effMaxAdvance != null
          ? t('blockDates.bookingWindowDays', { count: effMaxAdvance })
          : t('blockDates.bookingWindowGeneric')
      );
      return;
    }

    for (const guestId of selectedGuestIds) {
      const { error } = await createDirectStay({
        id: generateUuidV4(),
        stayRequestId: '',
        estateId: selectedEstateId,
        guestId,
        from,
        to,
      });
      if (error) {
        Alert.alert(t('blockDates.saveFailed'), error);
        return;
      }
    }

    const count = selectedGuestIds.length;
    Alert.alert(
      t('blockDates.savedTitle'),
      t('blockDates.savedBody', { count })
    );
    router.back();
  }

  const canSubmit =
    !!selectedEstateId &&
    selectedGuestIds.length > 0 &&
    !!from &&
    !!to &&
    !maxAdvanceBreak &&
    !(selectedEstateId && from && to && hasConflict(selectedEstateId, from, to));

  return (
    <ScreenShell title={t('titles.blockDates')}>
      <ScreenScroll gap={24} contentContainerStyle={styles.scroll}>
        <View style={styles.section}>
          <SectionLabel>{t('blockDates.property')}</SectionLabel>
          <View style={styles.pillRow}>
            {estates.map((e, i) => {
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
                  onPress={() => pickEstate(e.id)}
                  activeOpacity={0.75}
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
            <SectionLabel>
              {selectedGuestIds.length > 0
                ? t('blockDates.guestsSelected', { count: selectedGuestIds.length })
                : t('blockDates.guests')}
            </SectionLabel>
            <GroupedList>
              {guestOptions.map((g, i) => {
                const selected = selectedGuestIds.includes(g.id);
                return (
                  <GroupedRow
                    key={g.id}
                    title={g.name}
                    subtitle={g.email}
                    onPress={() => toggleGuest(g.id)}
                    isLast={i === guestOptions.length - 1}
                    trailing={
                      <View style={[
                        styles.checkbox,
                        {
                          backgroundColor: selected ? colors.tint : 'transparent',
                          borderColor: selected ? colors.tint : colors.icon + '55',
                        },
                      ]}>
                        {selected && <IconSymbol name="checkmark" size={12} color={colors.textOnBrand} />}
                      </View>
                    }
                  />
                );
              })}
            </GroupedList>
          </View>
        )}

        {selectedEstateId && (
          <View style={styles.section}>
            <SectionLabel>{t('blockDates.dates')}</SectionLabel>
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
          </View>
        )}

        <FilledButton
          label={t('blockDates.confirmCta')}
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
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  pickerWrap: { padding: 16, borderRadius: 16, borderWidth: 1 },
  summary: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
});
