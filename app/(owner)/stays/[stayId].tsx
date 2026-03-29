import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateRangePicker } from '@/components/ui/date-range-picker';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, EstateColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { useStayStore } from '@/store/stay-store';
import { formatDateRange, nightCount } from '@/lib/date-utils';

export default function EditStay() {
  const { stayId } = useLocalSearchParams<{ stayId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const { stays, updateStayDates, deleteStay } = useStayStore();
  const profileById = useProfileStore((s) => s.byId);

  const stay = stays.find((s) => s.id === stayId);
  const estate = allEstates.find((e) => e.id === stay?.estateId);
  const isOwner = stay?.guestId === currentUser?.id;
  const guestLabel = isOwner
    ? `${currentUser?.name?.split(' ')[0] ?? 'You'} (you)`
    : stay?.guestId
      ? resolveUserDisplayName(stay.guestId, profileById)
      : '';

  const estateIndex = useMemo(() => {
    const ownerEstates = allEstates.filter((e) => e.ownerId === currentUser?.id);
    return ownerEstates.findIndex((e) => e.id === stay?.estateId);
  }, [allEstates, currentUser?.id, stay?.estateId]);
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

  function save() {
    if (!from || !to || !stayId) return;
    updateStayDates(stayId, from, to);
    router.back();
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
          onPress: () => { deleteStay(stayId); router.back(); },
        },
      ]
    );
  }

  if (!stay) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <IconSymbol name="arrow.left" size={22} color={colors.tint} />
          </TouchableOpacity>
        </View>
        <ThemedText style={{ padding: 20, color: colors.icon }}>Stay not found.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>Edit Stay</ThemedText>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.tint }, !canSave && styles.disabled]}
          onPress={save}
          disabled={!canSave}
          activeOpacity={0.8}
        >
          <ThemedText style={styles.saveBtnText}>Save</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.summaryCard, { borderColor: colors.icon + '22', backgroundColor: colors.background }]}>
          <View style={[styles.estateDot, { backgroundColor: dotColor }]} />
          <View style={styles.summaryInfo}>
            <ThemedText type="defaultSemiBold" style={styles.summaryEstate}>{estate?.name}</ThemedText>
            <ThemedText style={[styles.summaryGuest, { color: colors.icon }]}>{guestLabel}</ThemedText>
          </View>
          {stay.stayRequestId === '' ? (
            <View style={[styles.typeBadge, { backgroundColor: colors.tint + '15' }]}>
              <ThemedText style={[styles.typeBadgeText, { color: colors.tint }]}>Direct</ThemedText>
            </View>
          ) : (
            <View style={[styles.typeBadge, { backgroundColor: '#22c55e18' }]}>
              <ThemedText style={[styles.typeBadgeText, { color: '#22c55e' }]}>Approved</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Dates</ThemedText>
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

        <TouchableOpacity
          style={[styles.deleteBtn, { backgroundColor: '#ef444412', borderColor: '#ef444430' }]}
          onPress={confirmDelete}
          activeOpacity={0.75}
        >
          <IconSymbol name="trash.fill" size={16} color="#ef4444" />
          <ThemedText style={styles.deleteBtnText}>Cancel Stay</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 24, fontWeight: '700' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  disabled: { opacity: 0.4 },
  scroll: { paddingHorizontal: 20, gap: 24, paddingTop: 4 },
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
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
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
  deleteBtnText: { fontSize: 14, fontWeight: '700', color: '#ef4444' },
});
