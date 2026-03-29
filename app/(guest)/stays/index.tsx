import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionHeader } from '@/components/ui/section-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, EstateColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useStayStore } from '@/store/stay-store';
import { formatDateRange, today } from '@/lib/date-utils';
import { Stay, StayRequest } from '@/types';

type UpcomingItem =
  | { type: 'request'; data: StayRequest; sortKey: string }
  | { type: 'direct'; data: Stay; sortKey: string };

export default function StaysOverview() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const allInvitations = useInvitationStore((s) => s.invitations);
  const { stayRequests, stays, cancelRequest, deleteStay, acceptAlternative, declineAlternative } = useStayStore();
  const todayStr = today();

  const acceptedEstateIds = useMemo(
    () =>
      allInvitations
        .filter(
          (inv) =>
            (inv.guestEmail === currentUser?.email || inv.guestId === currentUser?.id) &&
            inv.status === 'accepted'
        )
        .map((inv) => inv.estateId),
    [allInvitations, currentUser?.email, currentUser?.id]
  );

  const acceptedEstates = useMemo(
    () => allEstates.filter((e) => acceptedEstateIds.includes(e.id)),
    [allEstates, acceptedEstateIds]
  );

  const estateColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    acceptedEstates.forEach((e, i) => { map[e.id] = EstateColors[i % EstateColors.length]; });
    return map;
  }, [acceptedEstates]);

  const myRequests = useMemo(
    () => stayRequests.filter((r) => r.guestId === currentUser?.id),
    [stayRequests, currentUser?.id]
  );

  const myDirectStays = useMemo(
    () => stays.filter((s) => s.guestId === currentUser?.id && s.stayRequestId === ''),
    [stays, currentUser?.id]
  );

  const upcomingItems = useMemo<UpcomingItem[]>(() => {
    const requests = myRequests
      .filter((r) => r.requestedTo >= todayStr)
      .map((r): UpcomingItem => ({ type: 'request', data: r, sortKey: r.requestedFrom }));
    const direct = myDirectStays
      .filter((s) => s.to >= todayStr)
      .map((s): UpcomingItem => ({ type: 'direct', data: s, sortKey: s.from }));
    return [...requests, ...direct].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [myRequests, myDirectStays, todayStr]);

  const pastItems = useMemo<UpcomingItem[]>(() => {
    const requests = myRequests
      .filter((r) => r.requestedTo < todayStr)
      .map((r): UpcomingItem => ({ type: 'request', data: r, sortKey: r.requestedFrom }));
    const direct = myDirectStays
      .filter((s) => s.to < todayStr)
      .map((s): UpcomingItem => ({ type: 'direct', data: s, sortKey: s.from }));
    return [...requests, ...direct].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }, [myRequests, myDirectStays, todayStr]);

  const hasAny = myRequests.length > 0 || myDirectStays.length > 0;

  function renderRequestCard(req: StayRequest, interactive: boolean) {
    const estate = acceptedEstates.find((e) => e.id === req.estateId);
    const dotColor = estateColorMap[req.estateId] ?? colors.tint;
    return (
      <View
        key={req.id}
        style={[styles.card, { borderColor: colors.icon + '22', backgroundColor: colors.background }]}
      >
        <View style={[styles.colorBar, { backgroundColor: dotColor }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <View style={styles.cardTopLeft}>
              <ThemedText style={[styles.estateName, { color: dotColor }]}>{estate?.name}</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.dates}>
                {formatDateRange(req.requestedFrom, req.requestedTo)}
              </ThemedText>
            </View>
            <StatusBadge status={req.status} />
            {interactive && (req.status === 'pending' || req.status === 'approved') && (
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/(guest)/stays/edit', params: { requestId: req.id } } as never)}
                style={[styles.editBtn, { backgroundColor: colors.tint + '15' }]}
                activeOpacity={0.7}
              >
                <IconSymbol name="pencil" size={14} color={colors.tint} />
              </TouchableOpacity>
            )}
          </View>

          {req.ownerNote && (
            <ThemedText style={[styles.ownerNote, { backgroundColor: colors.tint + '11', color: colors.text }]}>
              Owner: {req.ownerNote}
            </ThemedText>
          )}

          {interactive && req.status === 'alternative_proposed' && req.alternativeFrom && req.alternativeTo && (
            <View style={styles.altSection}>
              <ThemedText style={[styles.altLabel, { color: colors.tint }]}>Proposed alternative:</ThemedText>
              <ThemedText type="defaultSemiBold">
                {formatDateRange(req.alternativeFrom, req.alternativeTo)}
              </ThemedText>
              <View style={styles.altActions}>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.tint }]}
                  onPress={() => {
                    const result = acceptAlternative(req.id);
                    if (!result.success) Alert.alert('Conflict', 'These dates are no longer available.');
                  }}
                >
                  <ThemedText style={styles.btnText}>Accept</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { borderColor: colors.icon + '44', borderWidth: 1 }]}
                  onPress={() => declineAlternative(req.id)}
                >
                  <ThemedText style={[styles.btnText, { color: colors.icon }]}>Decline</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {interactive && req.status === 'pending' && (
            <TouchableOpacity
              style={styles.cancelLink}
              onPress={() =>
                Alert.alert('Cancel Request', 'Cancel this stay request?', [
                  { text: 'Keep', style: 'cancel' },
                  { text: 'Cancel Request', style: 'destructive', onPress: () => cancelRequest(req.id) },
                ])
              }
            >
              <ThemedText style={{ color: colors.icon, fontSize: 13 }}>Cancel request</ThemedText>
            </TouchableOpacity>
          )}

          {interactive && req.status === 'approved' && (
            <TouchableOpacity
              style={styles.cancelLink}
              onPress={() =>
                Alert.alert('Cancel Stay', 'Are you sure you want to cancel this confirmed stay?', [
                  { text: 'Keep', style: 'cancel' },
                  {
                    text: 'Cancel Stay',
                    style: 'destructive',
                    onPress: () => {
                      const linked = stays.find((s) => s.stayRequestId === req.id);
                      if (linked) deleteStay(linked.id);
                      cancelRequest(req.id);
                    },
                  },
                ])
              }
            >
              <ThemedText style={{ color: colors.error, fontSize: 13 }}>Cancel stay</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  function renderDirectCard(stay: Stay) {
    const estate = acceptedEstates.find((e) => e.id === stay.estateId);
    const dotColor = estateColorMap[stay.estateId] ?? colors.tint;
    return (
      <View
        key={stay.id}
        style={[styles.card, { borderColor: colors.icon + '22', backgroundColor: colors.background }]}
      >
        <View style={[styles.colorBar, { backgroundColor: dotColor }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <View style={styles.cardTopLeft}>
              <ThemedText style={[styles.estateName, { color: dotColor }]}>{estate?.name}</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.dates}>
                {formatDateRange(stay.from, stay.to)}
              </ThemedText>
            </View>
            <Badge label="Confirmed" variant="approved" />
          </View>
        </View>
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

      {acceptedEstateIds.length > 0 && (
          <TouchableOpacity
            style={[styles.planBtn, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/(guest)/stays/plan' as never)}
            activeOpacity={0.8}
          >
            <IconSymbol name="plus" size={16} color="#fff" />
            <ThemedText style={styles.planBtnText}>Plan a Stay</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {!hasAny ? (
        <EmptyState
          icon="calendar"
          title="No stays yet"
          subtitle="Request a stay from any of your properties."
          actionLabel={acceptedEstateIds.length > 0 ? 'Plan a Stay' : undefined}
          onAction={
            acceptedEstateIds.length > 0
              ? () => router.push('/(guest)/stays/plan' as never)
              : undefined
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {upcomingItems.length > 0 && (
            <>
              <SectionHeader title={`Upcoming · ${upcomingItems.length}`} />
              {upcomingItems.map((item) =>
                item.type === 'request'
                  ? renderRequestCard(item.data, true)
                  : renderDirectCard(item.data)
              )}
            </>
          )}
          {pastItems.length > 0 && (
            <>
              <SectionHeader title={`Past · ${pastItems.length}`} />
              {pastItems.map((item) =>
                item.type === 'request'
                  ? renderRequestCard(item.data, false)
                  : renderDirectCard(item.data)
              )}
            </>
          )}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 28, fontWeight: '700' },
  planBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  planBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { paddingHorizontal: 20, paddingTop: 4 },
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  colorBar: { width: 4, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 14, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTopLeft: { flex: 1, gap: 2 },
  estateName: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  dates: { fontSize: 14 },
  ownerNote: { fontSize: 13, padding: 10, borderRadius: 8, lineHeight: 18 },
  altSection: { gap: 4 },
  altLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  altActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  cancelLink: { alignSelf: 'flex-start' },
  editBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
