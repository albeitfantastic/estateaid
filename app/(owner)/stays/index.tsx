import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/section-header';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, EstateColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useStayStore } from '@/store/stay-store';
import { SEED_USERS } from '@/store/seed-data';
import { today, formatDateRange } from '@/lib/date-utils';

export default function StaysIndex() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const allStays = useStayStore((s) => s.stays);
  const todayStr = today();

  const estates = useMemo(
    () => allEstates.filter((e) => e.ownerId === currentUser?.id),
    [allEstates, currentUser?.id]
  );
  const estateIds = useMemo(() => estates.map((e) => e.id), [estates]);

  const estateColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    estates.forEach((e, i) => { map[e.id] = EstateColors[i % EstateColors.length]; });
    return map;
  }, [estates]);

  const ownerStays = useMemo(
    () => allStays.filter((s) => estateIds.includes(s.estateId)),
    [allStays, estateIds]
  );

  const upcoming = useMemo(
    () => ownerStays.filter((s) => s.to >= todayStr).sort((a, b) => a.from.localeCompare(b.from)),
    [ownerStays, todayStr]
  );
  const past = useMemo(
    () => ownerStays.filter((s) => s.to < todayStr).sort((a, b) => b.from.localeCompare(a.from)),
    [ownerStays, todayStr]
  );

  function renderStayRow(stay: typeof ownerStays[0], editable: boolean) {
    const estate = estates.find((e) => e.id === stay.estateId);
    const isOwner = stay.guestId === currentUser?.id;
    const guest = isOwner ? null : SEED_USERS.find((u) => u.id === stay.guestId);
    const guestLabel = isOwner ? `${currentUser?.name.split(' ')[0]} (you)` : (guest?.name ?? stay.guestId);
    const dotColor = estateColorMap[stay.estateId] ?? colors.tint;

    return (
      <View
        key={stay.id}
        style={[styles.row, { backgroundColor: colors.background, borderColor: colors.icon + '22' }]}
      >
        <View style={[styles.colorBar, { backgroundColor: dotColor }]} />
        <View style={styles.rowInfo}>
          <View style={styles.rowTop}>
            <ThemedText type="defaultSemiBold" style={styles.guestName}>{guestLabel}</ThemedText>
            {isOwner && (
              <View style={[styles.ownerBadge, { backgroundColor: colors.tint + '18' }]}>
                <ThemedText style={[styles.ownerBadgeText, { color: colors.tint }]}>owner</ThemedText>
              </View>
            )}
          </View>
          <ThemedText style={[styles.meta, { color: colors.icon }]}>
            {estate?.name} · {formatDateRange(stay.from, stay.to)}
          </ThemedText>
        </View>
        {editable && (
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: colors.tint + '15' }]}
            onPress={() => router.push(`/(owner)/stays/${stay.id}` as never)}
            activeOpacity={0.75}
          >
            <IconSymbol name="pencil" size={15} color={colors.tint} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>Stays</ThemedText>
        <TouchableOpacity
          style={[styles.planBtn, { backgroundColor: colors.tint }]}
          onPress={() => router.push('/(owner)/plan-stay' as never)}
          activeOpacity={0.8}
        >
          <IconSymbol name="plus" size={18} color="#fff" />
          <ThemedText style={styles.planBtnText}>Plan</ThemedText>
        </TouchableOpacity>
      </View>

      {ownerStays.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="No stays yet"
          subtitle="Plan a stay or approve guest requests."
          actionLabel="Plan a Stay"
          onAction={() => router.push('/(owner)/plan-stay' as never)}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}>
          {upcoming.length > 0 && (
            <>
              <SectionHeader title={`Upcoming · ${upcoming.length}`} />
              {upcoming.map((s) => renderStayRow(s, true))}
            </>
          )}
          {past.length > 0 && (
            <>
              <SectionHeader title={`Past · ${past.length}`} />
              {past.map((s) => renderStayRow(s, false))}
            </>
          )}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 28, fontWeight: '700' },
  planBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  planBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { paddingHorizontal: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  colorBar: { width: 4, alignSelf: 'stretch' },
  rowInfo: { flex: 1, padding: 12, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  guestName: { fontSize: 14 },
  ownerBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  ownerBadgeText: { fontSize: 10, fontWeight: '700' },
  meta: { fontSize: 12 },
  editBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
});
