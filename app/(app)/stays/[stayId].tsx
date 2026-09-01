import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AddToCalendarButton } from '@/components/calendar/add-to-calendar-button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import {
  ScreenScroll,
  ScreenShell,
  SectionLabel,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { EstateColors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useGuestProfileStore } from '@/store/guest-profile-store';
import { useProfileStore } from '@/store/profile-store';
import { useStayStore } from '@/store/stay-store';
import { formatDateRange, nightCount } from '@/lib/date-utils';
import { useManagedEstates } from '@/lib/entitlements/capabilities';
import { resolveStayOccupantName, stayIsSelf } from '@/lib/stay-occupant';

export default function EditStay() {
  const { t } = useTranslation();
  const { stayId } = useLocalSearchParams<{ stayId: string }>();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const { stays, updateStayDates, deleteStay } = useStayStore();
  const profileById = useProfileStore((s) => s.byId);
  const guestProfiles = useGuestProfileStore((s) => s.profiles);
  const { estateIds: managedEstateIds } = useManagedEstates();

  const stay = stays.find((s) => s.id === stayId);
  const estate = allEstates.find((e) => e.id === stay?.estateId);
  const isOwner = stay ? stayIsSelf(stay, currentUser?.id) : false;
  const guestLabel = stay
    ? isOwner
      ? (currentUser?.name?.split(' ')[0] ?? t('common.you'))
      : resolveStayOccupantName(stay, { profilesById: profileById, guestProfiles })
    : '';

  const estateIndex = useMemo(
    () => managedEstateIds.indexOf(stay?.estateId ?? ''),
    [managedEstateIds, stay?.estateId]
  );
  const dotColor = EstateColors[estateIndex >= 0 ? estateIndex % EstateColors.length : 0];

  const blockedRanges = useMemo(() => {
    if (!stay) return [];
    return stays
      .filter((s) => s.estateId === stay.estateId && s.id !== stay.id)
      .map(({ from, to }) => ({ from, to }));
  }, [stays, stay]);

  const [from, setFrom] = useState<string | null>(stay?.from ?? null);
  const [to, setTo] = useState<string | null>(stay?.to ?? null);

  const hasChanges = from !== stay?.from || to !== stay?.to;
  const canSave = !!from && !!to && hasChanges;

  function goToCalendarStays() {
    router.replace('/(app)/calendar?segment=stays' as never);
  }

  function save() {
    if (!from || !to || !stayId) return;
    updateStayDates(stayId, from, to);
    goToCalendarStays();
  }

  function confirmDelete() {
    Alert.alert(
      'Cancel Stay',
      `Remove this stay for ${guestLabel}?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            deleteStay(stayId);
            goToCalendarStays();
          },
        },
      ]
    );
  }

  if (!stay) {
    return (
      <ScreenShell title={t('titles.editStay')} onBack={goToCalendarStays}>
        <ThemedText style={{ padding: 20, color: colors.icon }}>Stay not found.</ThemedText>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title={t('titles.editStay')}
      onBack={goToCalendarStays}
      headerRight={
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.tint }, !canSave && styles.disabled]}
          onPress={save}
          disabled={!canSave}
          activeOpacity={0.8}
        >
          <ThemedText style={[styles.saveBtnText, { color: colors.textOnBrand }]}>Save</ThemedText>
        </TouchableOpacity>
      }
    >
      <ScreenScroll gap={24} contentContainerStyle={styles.scroll}>
        <View style={[styles.summaryCard, { borderColor: colors.icon + '22', backgroundColor: colors.background }]}>
          <View style={[styles.estateDot, { backgroundColor: dotColor }]} />
          <View style={styles.summaryInfo}>
            <ThemedText type="defaultSemiBold" style={styles.summaryEstate}>{estate?.name}</ThemedText>
            <ThemedText style={[styles.summaryGuest, { color: colors.icon }]}>{guestLabel}</ThemedText>
            <ThemedText style={[styles.summaryGuest, { color: colors.icon }]}>
              {t('stayReview.guestCountValue', { count: stay.guestCount ?? 1 })}
            </ThemedText>
          </View>
          {stay.stayRequestId === '' ? (
            <View style={[styles.typeBadge, { backgroundColor: colors.tint + '15' }]}>
              <ThemedText style={[styles.typeBadgeText, { color: colors.tint }]}>Direct</ThemedText>
            </View>
          ) : (
            <View style={[styles.typeBadge, { backgroundColor: colors.success + '18' }]}>
              <ThemedText style={[styles.typeBadgeText, { color: colors.success }]}>Approved</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <SectionLabel>Dates</SectionLabel>
          <View style={[styles.pickerWrap, { borderColor: colors.icon + '33', backgroundColor: colors.background }]}>
            <DateRangePicker
              from={from}
              to={to}
              blockedRanges={blockedRanges}
              onChange={(f, t) => { setFrom(f); setTo(t); }}
            />
          </View>
          {from && to && (
            <View style={[styles.dateSummary, { backgroundColor: colors.tint + '11', borderColor: colors.tint + '33' }]}>
              <ThemedText type="defaultSemiBold">{formatDateRange(from, to)}</ThemedText>
              <ThemedText style={{ color: colors.icon }}>{nightCount(from, to)} nights</ThemedText>
            </View>
          )}
        </View>

        <AddToCalendarButton stay={stay} />

        <TouchableOpacity
          style={[styles.deleteBtn, { backgroundColor: colors.error + '12', borderColor: colors.error + '30' }]}
          onPress={confirmDelete}
          activeOpacity={0.75}
        >
          <IconSymbol name="trash.fill" size={16} color={colors.error} />
          <ThemedText style={[styles.deleteBtnText, { color: colors.error }]}>Cancel Stay</ThemedText>
        </TouchableOpacity>
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { fontWeight: '700', fontSize: 14 },
  disabled: { opacity: 0.4 },
  scroll: { paddingTop: 4 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  estateDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  summaryInfo: { flex: 1, gap: 2 },
  summaryEstate: { fontSize: 15 },
  summaryGuest: { fontSize: 12 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  section: { gap: 10 },
  pickerWrap: { padding: 16, borderRadius: 16, borderWidth: 1 },
  dateSummary: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  deleteBtnText: { fontSize: 14, fontWeight: '700' },
});
