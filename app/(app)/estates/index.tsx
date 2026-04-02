import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EstateCard } from '@/components/ui/estate-card';
import { EmptyState } from '@/components/ui/empty-state';
import { HostProLockTouchable } from '@/components/ui/host-pro-lock';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Elevation, Fonts, Layout, Radius } from '@/constants/theme';
import { useHasFullHostAccess } from '@/lib/access-tier';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { getEstateRole } from '@/lib/estate-role';
import { guestEmailsMatch } from '@/lib/invite-email';
import { showMaisonProUpgradePrompt } from '@/lib/maison-pro-upgrade';

export default function OwnerEstates() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const allInvitations = useInvitationStore((s) => s.invitations);
  const hasHostAccess = useHasFullHostAccess();

  const invitedEstateIds = useMemo(() => {
    if (!currentUser) return [] as string[];
    return allInvitations
      .filter(
        (inv) =>
          inv.status === 'accepted' &&
          (inv.guestId === currentUser.id || guestEmailsMatch(inv.guestEmail, currentUser.email))
      )
      .map((inv) => inv.estateId);
  }, [allInvitations, currentUser]);

  const estates = useMemo(
    () =>
      allEstates.filter(
        (e) => e.ownerId === (currentUser?.id ?? '') || invitedEstateIds.includes(e.id)
      ),
    [allEstates, currentUser?.id, invitedEstateIds]
  );

  const titleText = t('titles.properties');
  const tabTitleText = t('tabs.properties');

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7339/ingest/3b21f73e-4d1e-45e8-beb0-f14c26a6554d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '648fc5' },
      body: JSON.stringify({
        sessionId: '648fc5',
        runId: 'post-fix',
        hypothesisId: 'H1',
        location: 'app/(app)/estates/index.tsx:useEffect',
        message: 'Properties screen title i18n',
        data: {
          titleKey: 'titles.properties',
          titleLen: titleText?.length ?? -1,
          titleHead: typeof titleText === 'string' ? titleText.slice(0, 24) : null,
          tabLen: tabTitleText?.length ?? -1,
          tabHead: typeof tabTitleText === 'string' ? tabTitleText.slice(0, 24) : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }, [titleText, tabTitleText]);
  // #endregion

  return (
    <ThemedView style={styles.container}>
      <View
        style={[styles.header, { paddingTop: insets.top + Layout.sectionGap - 8 }]}
        onLayout={(e) => {
          // #region agent log
          const { x, y, width, height } = e.nativeEvent.layout;
          fetch('http://127.0.0.1:7339/ingest/3b21f73e-4d1e-45e8-beb0-f14c26a6554d', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '648fc5' },
            body: JSON.stringify({
              sessionId: '648fc5',
              runId: 'post-fix',
              hypothesisId: 'H2',
              location: 'app/(app)/estates/index.tsx:header.onLayout',
              message: 'Properties header layout',
              data: { x, y, width, height },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
        }}
      >
        <ThemedText
          type="title"
          style={styles.title}
          onLayout={(e) => {
            // #region agent log
            const { width, height } = e.nativeEvent.layout;
            fetch('http://127.0.0.1:7339/ingest/3b21f73e-4d1e-45e8-beb0-f14c26a6554d', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '648fc5' },
              body: JSON.stringify({
                sessionId: '648fc5',
                runId: 'post-fix',
                hypothesisId: 'H2',
                location: 'app/(app)/estates/index.tsx:title.onLayout',
                message: 'Properties title layout',
                data: { width, height },
                timestamp: Date.now(),
              }),
            }).catch(() => {});
            // #endregion
          }}
        >
          {titleText}
        </ThemedText>
        <View
          onLayout={(e) => {
            // #region agent log
            const { x, y, width, height } = e.nativeEvent.layout;
            fetch('http://127.0.0.1:7339/ingest/3b21f73e-4d1e-45e8-beb0-f14c26a6554d', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '648fc5' },
              body: JSON.stringify({
                sessionId: '648fc5',
                runId: 'post-fix',
                hypothesisId: 'H3',
                location: 'app/(app)/estates/index.tsx:addBtnWrap.onLayout',
                message: 'Add button layout',
                data: { x, y, width, height, expectW: Layout.touchMin, expectH: Layout.touchMin },
                timestamp: Date.now(),
              }),
            }).catch(() => {});
            // #endregion
          }}
        >
          <HostProLockTouchable
            locked={!hasHostAccess}
            shrinkToContent
            accessibilityRole="button"
            accessibilityLabel={t('estatesList.addEstate')}
            onPress={() => router.push('/(app)/estates/new' as never)}
            style={[styles.addBtn, { backgroundColor: colors.tint }, Elevation.fab[colorScheme ?? 'light']]}
            activeOpacity={0.8}
          >
            <IconSymbol name="plus" size={20} color="#fff" />
          </HostProLockTouchable>
        </View>
      </View>

      {estates.length === 0 ? (
        <EmptyState
          icon="building.2.fill"
          title={t('estatesList.emptyTitle')}
          subtitle={t('estatesList.emptySub')}
          actionLabel={t('estatesList.addEstate')}
          onAction={() =>
            hasHostAccess
              ? router.push('/(app)/estates/new' as never)
              : showMaisonProUpgradePrompt(t)
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {estates.map((estate) => {
            const isOwned = estate.ownerId === currentUser?.id;
            const lockedOwned = isOwned && !hasHostAccess;
            const invRole = isOwned
              ? null
              : getEstateRole(allInvitations, estate.id, currentUser!.id, currentUser?.email);
            return (
              <View key={estate.id} style={styles.cardWrap}>
                <EstateCard
                  estate={estate}
                  onPress={() => router.push(`/(app)/estates/${estate.id}` as never)}
                />
                {lockedOwned && (
                  <View pointerEvents="none" style={styles.cardLockBadge}>
                    <IconSymbol name="lock.fill" size={11} color="#fff" />
                  </View>
                )}
                {invRole && (
                  <View style={[styles.roleBadge, { backgroundColor: colors.icon + '15' }]}>
                    <ThemedText style={[styles.roleBadgeText, { color: colors.icon }]}>
                      {invRole === 'owner'
                        ? t('ownerInvite.estateRoleCoOwnerLabel')
                        : t('ownerInvite.estateRoleGuestLabel')}
                    </ThemedText>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPaddingX,
    paddingBottom: Layout.sectionGap,
    gap: 12,
  },
  title: { flex: 1, flexShrink: 1, fontSize: 28, fontWeight: '700', paddingRight: 8 },
  container: { flex: 1 },
  addBtn: {
    width: Layout.touchMin,
    height: Layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  back: { padding: 4 },
  list: { paddingHorizontal: Layout.screenPaddingX, paddingTop: 10, gap: 4 },
  cardWrap: { position: 'relative', borderRadius: Radius.lg, overflow: 'hidden' },
  cardLockBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: -6,
    marginBottom: 10,
    marginLeft: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: Fonts.labelBold,
  },
});
