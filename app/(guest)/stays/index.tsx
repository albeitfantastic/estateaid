import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Badge, StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, EstateColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useStayStore } from '@/store/stay-store';
import { formatDateRange, today } from '@/lib/date-utils';
import { guestEmailsMatch } from '@/lib/invite-email';
import { Stay, StayRequest } from '@/types';

type UpcomingItem =
  | { type: 'request'; data: StayRequest; sortKey: string }
  | { type: 'direct'; data: Stay; sortKey: string };

export default function StaysOverview() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const allInvitations = useInvitationStore((s) => s.invitations);
  const { stayRequests, stays, cancelRequest, deleteStay, acceptAlternative, declineAlternative } = useStayStore();
  const todayStr = today();

  const [tab, setTab] = useState<'upcoming' | 'requests'>('upcoming');

  const acceptedEstateIds = useMemo(
    () =>
      allInvitations
        .filter(
          (inv) =>
            (guestEmailsMatch(inv.guestEmail, currentUser?.email) || inv.guestId === currentUser?.id) &&
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
    () =>
      stayRequests
        .filter((r) => r.guestId === currentUser?.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
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

  const pendingCount = useMemo(
    () => myRequests.filter((r) => r.status === 'pending').length,
    [myRequests]
  );

  function renderRequestCard(req: StayRequest, interactive: boolean) {
    const estate = acceptedEstates.find((e) => e.id === req.estateId);
    const dotColor = estateColorMap[req.estateId] ?? colors.tint;
    return (
      <View
        key={req.id}
        style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}
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
              {t('guestStays.ownerPrefix')} {req.ownerNote}
            </ThemedText>
          )}

          {interactive && req.status === 'alternative_proposed' && req.alternativeFrom && req.alternativeTo && (
            <View style={styles.altSection}>
              <ThemedText style={[styles.altLabel, { color: colors.tint }]}>{t('guestStays.proposedAlt')}</ThemedText>
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
                  <ThemedText style={styles.btnText}>{t('actions.accept')}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { borderColor: colors.icon + '44', borderWidth: 1 }]}
                  onPress={() => declineAlternative(req.id)}
                >
                  <ThemedText style={[styles.btnText, { color: colors.icon }]}>{t('actions.decline')}</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {interactive && req.status === 'pending' && (
            <TouchableOpacity
              style={styles.cancelLink}
              onPress={() =>
                Alert.alert(t('guestStays.cancelRequestTitle'), t('guestStays.cancelRequestBody'), [
                  { text: t('actions.keep'), style: 'cancel' },
                  {
                    text: t('guestStays.cancelRequestCta'),
                    style: 'destructive',
                    onPress: () => cancelRequest(req.id),
                  },
                ])
              }
            >
              <ThemedText style={{ color: colors.icon, fontSize: 13 }}>{t('guestStays.cancelRequestLink')}</ThemedText>
            </TouchableOpacity>
          )}

          {interactive && req.status === 'approved' && (
            <TouchableOpacity
              style={styles.cancelLink}
              onPress={() =>
                Alert.alert(t('guestStays.cancelStayTitle'), t('guestStays.cancelStayBody'), [
                  { text: t('actions.keep'), style: 'cancel' },
                  {
                    text: t('guestStays.cancelStayCta'),
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
              <ThemedText style={{ color: colors.error, fontSize: 13 }}>{t('guestStays.cancelStayLink')}</ThemedText>
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
        style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}
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
            <Badge label={t('actions.confirmed')} variant="approved" />
          </View>
        </View>
      </View>
    );
  }

  function renderAllRequestCard(req: StayRequest) {
    const estate = acceptedEstates.find((e) => e.id === req.estateId);
    const dotColor = estateColorMap[req.estateId] ?? colors.tint;
    return (
      <View
        key={req.id}
        style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}
      >
        <View style={[styles.colorBar, { backgroundColor: dotColor }]} />
        <View style={styles.reqInfo}>
          <View style={styles.rowTop}>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">{estate?.name ?? t('common.unknownEstate')}</ThemedText>
              <ThemedText style={[styles.reqDates, { color: colors.icon }]}>
                {formatDateRange(req.requestedFrom, req.requestedTo)}
              </ThemedText>
            </View>
            <StatusBadge status={req.status} />
          </View>
          {req.guestNote ? (
            <ThemedText style={[styles.note, { color: colors.icon }]} numberOfLines={2}>
              {req.guestNote}
            </ThemedText>
          ) : null}
          {req.ownerNote ? (
            <View style={[styles.ownerNoteBox, { backgroundColor: colors.tint + '08' }]}>
              <ThemedText style={[styles.ownerNoteLabel, { color: colors.tint }]}>
                {t('guestStays.ownerNoteLabel')}
              </ThemedText>
              <ThemedText style={[styles.note, { color: colors.text }]}>{req.ownerNote}</ThemedText>
            </View>
          ) : null}
          {req.status === 'alternative_proposed' && req.alternativeFrom && req.alternativeTo && (
            <ThemedText style={[styles.altDates, { color: colors.tint }]}>
              {t('guestStays.proposed')}: {formatDateRange(req.alternativeFrom, req.alternativeTo)}
            </ThemedText>
          )}
        </View>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <ThemedText type="title" style={styles.title}>{t('guestStays.title')}</ThemedText>
      </View>

      {/* Tab switcher */}
      <View style={[styles.tabRow, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'upcoming' && { backgroundColor: colors.tint }]}
          onPress={() => setTab('upcoming')}
          activeOpacity={0.8}
        >
          <ThemedText style={[styles.tabLabel, tab === 'upcoming' && styles.tabLabelActive]}>
            {t('guestStays.upcoming')}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'requests' && { backgroundColor: colors.tint }]}
          onPress={() => setTab('requests')}
          activeOpacity={0.8}
        >
          <ThemedText style={[styles.tabLabel, tab === 'requests' && styles.tabLabelActive]}>
            {t('guestStays.requestsTab')}
          </ThemedText>
          {pendingCount > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: tab === 'requests' ? '#fff' : colors.tint }]}>
              <ThemedText style={[styles.tabBadgeText, { color: tab === 'requests' ? colors.tint : '#fff' }]}>
                {pendingCount}
              </ThemedText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Upcoming tab */}
      {tab === 'upcoming' && (
        upcomingItems.length === 0 ? (
          <EmptyState
            icon="calendar"
            title={t('guestStays.noUpcomingTitle')}
            subtitle={t('guestStays.noUpcomingSub')}
            actionLabel={acceptedEstateIds.length > 0 ? t('guestStays.planStayCta') : undefined}
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
            {upcomingItems.map((item) =>
              item.type === 'request'
                ? renderRequestCard(item.data, true)
                : renderDirectCard(item.data)
            )}
            {acceptedEstateIds.length > 0 && (
              <TouchableOpacity
                style={[styles.scheduleBtn, { backgroundColor: colors.tint }]}
                onPress={() => router.push('/(guest)/stays/plan' as never)}
                activeOpacity={0.85}
              >
                <IconSymbol name="plus" size={16} color="#fff" />
                <ThemedText style={styles.scheduleBtnText}>Plan a Stay</ThemedText>
              </TouchableOpacity>
            )}
          </ScrollView>
        )
      )}

      {/* Requests tab */}
      {tab === 'requests' && (
        myRequests.length === 0 ? (
          <EmptyState
            icon="tray.fill"
            title={t('guestStays.emptyRequestsTitle')}
            subtitle={t('guestStays.emptyRequestsSub')}
          />
        ) : (
          <ScrollView
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
          >
            {myRequests.map((req) => renderAllRequestCard(req))}
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
  list: { paddingHorizontal: 20, paddingTop: 4 },
  // card (shared)
  card: {
    flexDirection: 'row',
    borderRadius: 12,
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
  // schedule button
  scheduleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 16, marginTop: 8 },
  scheduleBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // requests tab rows
  reqInfo: { flex: 1, padding: 14, gap: 6 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  reqDates: { fontSize: 13, marginTop: 2 },
  note: { fontSize: 13, lineHeight: 18 },
  ownerNoteBox: { padding: 10, borderRadius: 10, gap: 4 },
  ownerNoteLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  altDates: { fontSize: 13, fontWeight: '600' },
});
