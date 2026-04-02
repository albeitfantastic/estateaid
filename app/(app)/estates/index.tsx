import { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
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

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Layout.sectionGap - 8 }]}>
        <ThemedText type="title" style={styles.title}>{t('titles.properties')}</ThemedText>
        <HostProLockTouchable
          locked={!hasHostAccess}
          onPress={() => router.push('/(app)/estates/new' as never)}
          style={[styles.addBtn, { backgroundColor: colors.tint }, Elevation.fab[colorScheme ?? 'light']]}
          activeOpacity={0.8}
        >
          <IconSymbol name="plus" size={18} color="#fff" />
          <ThemedText style={styles.addBtnText}>Add New</ThemedText>
        </HostProLockTouchable>
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
    alignItems: 'center',
    paddingHorizontal: Layout.screenPaddingX,
    paddingBottom: Layout.sectionGap,
    gap: 12,
  },
  title: { flex: 1, fontSize: 28, fontWeight: '700' },
  container: { flex: 1 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: Radius.full,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, fontFamily: Fonts.headingSemiBold },
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
