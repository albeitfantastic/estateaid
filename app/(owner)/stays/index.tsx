import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, EstateColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { today, formatDateRange } from '@/lib/date-utils';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { useStayStore } from '@/store/stay-store';

export default function StaysIndex() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const allStays = useStayStore((s) => s.stays);
  const stayRequests = useStayStore((s) => s.stayRequests);
  const profileById = useProfileStore((s) => s.byId);
  const invitations = useInvitationStore((s) => s.invitations);
  const todayStr = today();

  const [tab, setTab] = useState<'upcoming' | 'requests'>('upcoming');

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

  const pendingRequests = useMemo(
    () =>
      stayRequests
        .filter((r) => estateIds.includes(r.estateId) && r.status === 'pending')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [stayRequests, estateIds]
  );

  function renderStayRow(stay: typeof ownerStays[0]) {
    const estate = estates.find((e) => e.id === stay.estateId);
    const isOwner = stay.guestId === currentUser?.id;
    const guestLabel = isOwner
      ? `${currentUser?.name?.split(' ')[0] ?? 'You'} (you)`
      : resolveUserDisplayName(stay.guestId, profileById);
    const dotColor = estateColorMap[stay.estateId] ?? colors.tint;

    return (
      <View
        key={stay.id}
        style={[styles.stayRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
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
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: colors.tint + '15' }]}
          onPress={() => router.push(`/(owner)/stays/${stay.id}` as never)}
          activeOpacity={0.75}
        >
          <IconSymbol name="pencil" size={15} color={colors.tint} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <ThemedText type="title" style={styles.title}>{t('titles.stays')}</ThemedText>
      </View>

      {/* Tab switcher */}
      <View style={[styles.tabRow, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'upcoming' && { backgroundColor: colors.tint }]}
          onPress={() => setTab('upcoming')}
          activeOpacity={0.8}
        >
          <ThemedText style={[styles.tabLabel, tab === 'upcoming' && styles.tabLabelActive]}>
            Upcoming
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'requests' && { backgroundColor: colors.tint }]}
          onPress={() => setTab('requests')}
          activeOpacity={0.8}
        >
          <ThemedText style={[styles.tabLabel, tab === 'requests' && styles.tabLabelActive]}>
            Requests
          </ThemedText>
          {pendingRequests.length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: tab === 'requests' ? '#fff' : colors.tint }]}>
              <ThemedText style={[styles.tabBadgeText, { color: tab === 'requests' ? colors.tint : '#fff' }]}>
                {pendingRequests.length}
              </ThemedText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Upcoming tab */}
      {tab === 'upcoming' && (
        upcoming.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="No upcoming stays"
            subtitle="Schedule a stay for yourself or a guest."
            actionLabel="Schedule a Stay"
            onAction={() => router.push('/(owner)/plan-stay' as never)}
          />
        ) : (
          <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}>
            {upcoming.map((s) => renderStayRow(s))}
            <TouchableOpacity
              style={[styles.scheduleBtn, { backgroundColor: colors.tint }]}
              onPress={() => router.push('/(owner)/plan-stay' as never)}
              activeOpacity={0.85}
            >
              <IconSymbol name="plus" size={16} color="#fff" />
              <ThemedText style={styles.scheduleBtnText}>Schedule a Stay</ThemedText>
            </TouchableOpacity>
          </ScrollView>
        )
      )}

      {/* Requests tab */}
      {tab === 'requests' && (
        pendingRequests.length === 0 ? (
          <EmptyState
            icon="tray.fill"
            title="All caught up"
            subtitle="No pending stay requests across your estates."
          />
        ) : (
          <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}>
            {pendingRequests.map((req) => {
              const estate = estates.find((e) => e.id === req.estateId);
              const emailHint = invitations.find(
                (i) => i.guestId === req.guestId && i.guestEmail
              )?.guestEmail;
              const guestName = resolveUserDisplayName(req.guestId, profileById, emailHint);
              return (
                <TouchableOpacity
                  key={req.id}
                  style={[styles.reqRow, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={() => router.push(`/(owner)/estates/${req.estateId}/stays/${req.id}` as never)}
                  activeOpacity={0.8}
                >
                  <Avatar name={guestName} size={44} color={colors.tint} />
                  <View style={styles.reqInfo}>
                    <ThemedText type="defaultSemiBold">{guestName}</ThemedText>
                    <ThemedText style={[styles.reqEstate, { color: colors.tint }]}>{estate?.name}</ThemedText>
                    <ThemedText style={[styles.reqDates, { color: colors.icon }]}>
                      {formatDateRange(req.requestedFrom, req.requestedTo)}
                    </ThemedText>
                  </View>
                  <View style={styles.reqRight}>
                    <StatusBadge status={req.status} />
                    <IconSymbol name="chevron.right" size={16} color={colors.icon} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 },
  title: { flex: 1, fontSize: 28, fontWeight: '700' },
  // tabs
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20 },
  tabLabel: { fontSize: 14, fontWeight: '600' },
  tabLabelActive: { color: '#fff' },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText: { fontSize: 11, fontWeight: '700' },
  // list
  list: { paddingHorizontal: 20 },
  // stay row
  stayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
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
  // schedule button
  scheduleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 16, marginTop: 8 },
  scheduleBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // request row
  reqRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10, gap: 12 },
  reqInfo: { flex: 1, gap: 2 },
  reqEstate: { fontSize: 12, fontWeight: '600' },
  reqDates: { fontSize: 13 },
  reqRight: { alignItems: 'flex-end', gap: 6 },
});
