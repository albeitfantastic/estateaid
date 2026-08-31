import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { GuestInvitationsReceivePanel } from '@/components/invitations/guest-invitations-receive-panel';
import { InviteContent } from '@/components/invite-content';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, EstateColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { acceptedInvitedEstateIds } from '@/lib/accepted-invited-estates';
import { formatDateRange, today } from '@/lib/date-utils';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { useStayStore } from '@/store/stay-store';
import type { Stay, StayRequest } from '@/types';

type HostTab = 'upcoming' | 'invite' | 'redeem';
type GuestTab = 'my-stays' | 'requests' | 'redeem';

function paramString(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return '';
}

export default function StaysIndex() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    tab?: string | string[];
    estateId?: string | string[];
    code?: string | string[];
  }>();
  const filterEstateId = paramString(params.estateId);
  const inviteCode = paramString(params.code);
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const allStays = useStayStore((s) => s.stays);
  const stayRequests = useStayStore((s) => s.stayRequests);
  const profileById = useProfileStore((s) => s.byId);
  const invitations = useInvitationStore((s) => s.invitations);
  const getPendingInvitationsForGuest = useInvitationStore((s) => s.getPendingInvitationsForGuest);
  const todayStr = today();

  const [hostTab, setHostTab] = useState<HostTab>('upcoming');
  const [guestTab, setGuestTab] = useState<GuestTab>('my-stays');

  const pendingRedeemInvitations = useMemo(
    () => getPendingInvitationsForGuest(currentUser?.id ?? '', currentUser?.email),
    [getPendingInvitationsForGuest, currentUser?.id, currentUser?.email, invitations]
  );

  const ownedEstates = useMemo(
    () => allEstates.filter((e) => e.ownerId === currentUser?.id),
    [allEstates, currentUser?.id]
  );
  const ownsAny = ownedEstates.length > 0;

  const invitedEstateIds = useMemo(
    () => acceptedInvitedEstateIds(invitations, currentUser?.id, currentUser?.email),
    [invitations, currentUser?.id, currentUser?.email]
  );

  const filterIsOwned = !!filterEstateId && ownedEstates.some((e) => e.id === filterEstateId);
  const filterIsInvitedOnly =
    !!filterEstateId && !filterIsOwned && invitedEstateIds.includes(filterEstateId);

  /** Guest surface when user owns nothing, or hub deep-link to an invited (non-owned) estate. */
  const guestMode = !ownsAny || filterIsInvitedOnly;

  useEffect(() => {
    const raw = params.tab;
    const v = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
    const lower = v?.toLowerCase() ?? '';
    if (inviteCode || lower === 'redeem') {
      if (guestMode) setGuestTab('redeem');
      else setHostTab('redeem');
      return;
    }
    if (guestMode) {
      if (lower === 'requests') setGuestTab('requests');
      else if (lower === 'invite') setGuestTab('my-stays');
    } else {
      if (lower === 'invite') setHostTab('invite');
    }
  }, [params.tab, guestMode, inviteCode]);

  const ownedEstateIds = useMemo(() => ownedEstates.map((e) => e.id), [ownedEstates]);

  const estateColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const colorSource = guestMode
      ? allEstates.filter(
          (e) => e.ownerId === currentUser?.id || invitedEstateIds.includes(e.id)
        )
      : ownedEstates;
    colorSource.forEach((e, i) => {
      map[e.id] = EstateColors[i % EstateColors.length];
    });
    return map;
  }, [guestMode, allEstates, currentUser?.id, invitedEstateIds, ownedEstates]);

  const ownerStays = useMemo(
    () => allStays.filter((s) => ownedEstateIds.includes(s.estateId)),
    [allStays, ownedEstateIds]
  );

  const upcoming = useMemo(
    () => ownerStays.filter((s) => s.to >= todayStr).sort((a, b) => a.from.localeCompare(b.from)),
    [ownerStays, todayStr]
  );

  const pendingRequests = useMemo(
    () =>
      stayRequests
        .filter((r) => ownedEstateIds.includes(r.estateId) && r.status === 'pending')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [stayRequests, ownedEstateIds]
  );

  const myGuestStays = useMemo(() => {
    let list = allStays.filter((s) => s.guestId === currentUser?.id);
    if (filterIsInvitedOnly) list = list.filter((s) => s.estateId === filterEstateId);
    return list.filter((s) => s.to >= todayStr).sort((a, b) => a.from.localeCompare(b.from));
  }, [allStays, currentUser?.id, filterIsInvitedOnly, filterEstateId, todayStr]);

  const myGuestRequests = useMemo(() => {
    let list = stayRequests.filter((r) => r.guestId === currentUser?.id);
    if (filterIsInvitedOnly) list = list.filter((r) => r.estateId === filterEstateId);
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [stayRequests, currentUser?.id, filterIsInvitedOnly, filterEstateId]);

  function estateName(estateId: string): string {
    return allEstates.find((e) => e.id === estateId)?.name ?? 'Property';
  }

  function planStayHref(): string {
    return filterIsInvitedOnly
      ? `/(app)/stays/plan?estateId=${filterEstateId}`
      : '/(app)/stays/plan';
  }

  function renderHostStayRow(stay: Stay) {
    const estate = ownedEstates.find((e) => e.id === stay.estateId);
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
                <ThemedText style={[styles.ownerBadgeText, { color: colors.tint }]}>Host</ThemedText>
              </View>
            )}
          </View>
          <ThemedText style={[styles.meta, { color: colors.icon }]}>
            {estate?.name} · {formatDateRange(stay.from, stay.to)}
          </ThemedText>
        </View>
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: colors.tint + '15' }]}
          onPress={() => router.push(`/(app)/stays/${stay.id}` as never)}
          activeOpacity={0.75}
        >
          <IconSymbol name="pencil" size={15} color={colors.tint} />
        </TouchableOpacity>
      </View>
    );
  }

  function renderGuestStayRow(stay: Stay) {
    const dotColor = estateColorMap[stay.estateId] ?? colors.tint;
    return (
      <TouchableOpacity
        key={stay.id}
        style={[styles.stayRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push(`/(app)/stays/${stay.id}` as never)}
        activeOpacity={0.75}
      >
        <View style={[styles.colorBar, { backgroundColor: dotColor }]} />
        <View style={styles.rowInfo}>
          <ThemedText type="defaultSemiBold" style={styles.guestName}>
            {estateName(stay.estateId)}
          </ThemedText>
          <ThemedText style={[styles.meta, { color: colors.icon }]}>
            {formatDateRange(stay.from, stay.to)}
          </ThemedText>
        </View>
        <View style={[styles.editBtn, { backgroundColor: colors.tint + '15' }]}>
          <IconSymbol name="chevron.right" size={14} color={colors.tint} />
        </View>
      </TouchableOpacity>
    );
  }

  function renderGuestRequestRow(req: StayRequest) {
    const dotColor = estateColorMap[req.estateId] ?? colors.tint;
    return (
      <View
        key={req.id}
        style={[styles.stayRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={[styles.colorBar, { backgroundColor: dotColor }]} />
        <View style={styles.rowInfo}>
          <View style={styles.rowTop}>
            <ThemedText type="defaultSemiBold" style={styles.guestName}>
              {estateName(req.estateId)}
            </ThemedText>
            <StatusBadge status={req.status} />
          </View>
          <ThemedText style={[styles.meta, { color: colors.icon }]}>
            {formatDateRange(req.requestedFrom, req.requestedTo)}
          </ThemedText>
          {req.ownerNote ? (
            <ThemedText style={[styles.meta, { color: colors.icon }]} numberOfLines={2}>
              {t('guestStays.ownerNoteLabel')}: {req.ownerNote}
            </ThemedText>
          ) : null}
        </View>
      </View>
    );
  }

  if (guestMode) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <ThemedText type="title" style={styles.title}>{t('guestStays.title')}</ThemedText>
        </View>

        <View style={[styles.tabRow, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.tabBtn, guestTab === 'my-stays' && { backgroundColor: colors.tint }]}
            onPress={() => setGuestTab('my-stays')}
            activeOpacity={0.8}
          >
            <ThemedText style={[styles.tabLabel, guestTab === 'my-stays' && styles.tabLabelActive]}>
              {t('guestStays.upcoming')}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, guestTab === 'requests' && { backgroundColor: colors.tint }]}
            onPress={() => setGuestTab('requests')}
            activeOpacity={0.8}
          >
            <ThemedText style={[styles.tabLabel, guestTab === 'requests' && styles.tabLabelActive]}>
              {t('guestStays.requestsTab')}
            </ThemedText>
            {myGuestRequests.filter((r) => r.status === 'pending').length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: guestTab === 'requests' ? '#fff' : colors.tint }]}>
                <ThemedText style={[styles.tabBadgeText, { color: guestTab === 'requests' ? colors.tint : '#fff' }]}>
                  {myGuestRequests.filter((r) => r.status === 'pending').length}
                </ThemedText>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, guestTab === 'redeem' && { backgroundColor: colors.tint }]}
            onPress={() => setGuestTab('redeem')}
            activeOpacity={0.8}
          >
            <ThemedText style={[styles.tabLabel, guestTab === 'redeem' && styles.tabLabelActive]}>
              {t('ownerStaysTabs.redeemTab')}
            </ThemedText>
            {pendingRedeemInvitations.length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: guestTab === 'redeem' ? '#fff' : colors.tint }]}>
                <ThemedText style={[styles.tabBadgeText, { color: guestTab === 'redeem' ? colors.tint : '#fff' }]}>
                  {pendingRedeemInvitations.length}
                </ThemedText>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {guestTab === 'my-stays' && (
          myGuestStays.length === 0 ? (
            <EmptyState
              icon="calendar"
              title={
                invitedEstateIds.length === 0
                  ? t('guestStays.emptyInviteTitle')
                  : t('guestStays.noUpcomingTitle')
              }
              subtitle={
                invitedEstateIds.length === 0
                  ? t('guestStays.emptyInviteSub')
                  : t('guestStays.noUpcomingSub')
              }
              actionLabel={
                invitedEstateIds.length === 0
                  ? t('guestStays.enterCode')
                  : t('guestStays.planStayCta')
              }
              onAction={() =>
                invitedEstateIds.length === 0
                  ? setGuestTab('redeem')
                  : router.push(planStayHref() as never)
              }
            />
          ) : (
            <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}>
              {myGuestStays.map((s) => renderGuestStayRow(s))}
              <TouchableOpacity
                style={[styles.scheduleBtn, { backgroundColor: colors.tint }]}
                onPress={() => router.push(planStayHref() as never)}
                activeOpacity={0.85}
              >
                <IconSymbol name="plus" size={16} color="#fff" />
                <ThemedText style={styles.scheduleBtnText}>{t('guestStays.planStayCta')}</ThemedText>
              </TouchableOpacity>
            </ScrollView>
          )
        )}

        {guestTab === 'requests' && (
          myGuestRequests.length === 0 ? (
            <EmptyState
              icon="tray.fill"
              title={t('guestStays.emptyRequestsTitle')}
              subtitle={t('guestStays.emptyRequestsSub')}
              actionLabel={t('guestStays.planStayCta')}
              onAction={() => router.push(planStayHref() as never)}
            />
          ) : (
            <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}>
              {myGuestRequests.map((r) => renderGuestRequestRow(r))}
            </ScrollView>
          )
        )}

        {guestTab === 'redeem' && (
          <ScrollView
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
          >
            <GuestInvitationsReceivePanel initialCode={inviteCode || undefined} />
          </ScrollView>
        )}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <ThemedText type="title" style={styles.title}>{t('titles.stays')}</ThemedText>
      </View>

      <View style={[styles.tabRow, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.tabBtn, hostTab === 'upcoming' && { backgroundColor: colors.tint }]}
          onPress={() => setHostTab('upcoming')}
          activeOpacity={0.8}
        >
          <ThemedText style={[styles.tabLabel, hostTab === 'upcoming' && styles.tabLabelActive]}>
            {t('ownerStaysTabs.upcomingTab')}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => router.push('/(app)/requests' as never)}
          activeOpacity={0.8}
        >
          <ThemedText style={styles.tabLabel}>
            {t('ownerStaysTabs.requestsTab')}
          </ThemedText>
          {pendingRequests.length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: colors.tint }]}>
              <ThemedText style={[styles.tabBadgeText, { color: '#fff' }]}>
                {pendingRequests.length}
              </ThemedText>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, hostTab === 'invite' && { backgroundColor: colors.tint }]}
          onPress={() => setHostTab('invite')}
          activeOpacity={0.8}
        >
          <ThemedText style={[styles.tabLabel, hostTab === 'invite' && styles.tabLabelActive]}>
            {t('ownerStaysTabs.inviteTab')}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, hostTab === 'redeem' && { backgroundColor: colors.tint }]}
          onPress={() => setHostTab('redeem')}
          activeOpacity={0.8}
        >
          <ThemedText style={[styles.tabLabel, hostTab === 'redeem' && styles.tabLabelActive]}>
            {t('ownerStaysTabs.redeemTab')}
          </ThemedText>
          {pendingRedeemInvitations.length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: hostTab === 'redeem' ? '#fff' : colors.tint }]}>
              <ThemedText style={[styles.tabBadgeText, { color: hostTab === 'redeem' ? colors.tint : '#fff' }]}>
                {pendingRedeemInvitations.length}
              </ThemedText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {hostTab === 'upcoming' && (
        upcoming.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="No upcoming stays"
            subtitle="Block dates for yourself or a guest."
            actionLabel="Block dates"
            onAction={() => router.push('/(app)/stays/block' as never)}
          />
        ) : (
          <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}>
            {upcoming.map((s) => renderHostStayRow(s))}
            <TouchableOpacity
              style={[styles.scheduleBtn, { backgroundColor: colors.tint }]}
              onPress={() => router.push('/(app)/stays/block' as never)}
              activeOpacity={0.85}
            >
              <IconSymbol name="plus" size={16} color="#fff" />
              <ThemedText style={styles.scheduleBtnText}>Block dates</ThemedText>
            </TouchableOpacity>
          </ScrollView>
        )
      )}

      {hostTab === 'invite' && (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <InviteContent layout="embedded" />
        </ScrollView>
      )}

      {hostTab === 'redeem' && (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <GuestInvitationsReceivePanel initialCode={inviteCode || undefined} />
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 },
  title: { flex: 1, fontSize: 28, fontWeight: '700' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 20,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  tabLabelActive: { color: '#fff' },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText: { fontSize: 11, fontWeight: '700' },
  list: { paddingHorizontal: 20 },
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
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  guestName: { fontSize: 14 },
  ownerBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  ownerBadgeText: { fontSize: 10, fontWeight: '700' },
  meta: { fontSize: 12 },
  editBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  scheduleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 16, marginTop: 8 },
  scheduleBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
