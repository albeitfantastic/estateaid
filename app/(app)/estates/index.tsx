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
import { useCan } from '@/lib/entitlements/capabilities';
import { getEstateActorRole } from '@/lib/estate-role';
import { openEstateCreatePaywall } from '@/lib/maison-pro-upgrade';
import { useAppTheme } from '@/theme/useAppTheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateCoverageStore } from '@/store/estate-coverage-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { acceptedInvitedEstateIds } from '@/lib/accepted-invited-estates';

export default function EstatesList() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const appTheme = useAppTheme();
  const colors = appTheme.colors;
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const allInvitations = useInvitationStore((s) => s.invitations);
  const coverageById = useEstateCoverageStore((s) => s.byId);
  const can = useCan();
  const canCreate = can('property.create');
  const addLocked = !canCreate;

  const invitedEstateIds = useMemo(
    () => acceptedInvitedEstateIds(allInvitations, currentUser?.id, currentUser?.email),
    [allInvitations, currentUser]
  );

  const isCoOwnerElsewhere = useMemo(() => {
    if (!currentUser) return false;
    return allEstates.some((e) => {
      const role = getEstateActorRole(allEstates, allInvitations, e.id, currentUser.id, currentUser.email);
      return role === 'owner';
    });
  }, [allEstates, allInvitations, currentUser]);

  const estates = useMemo(
    () =>
      allEstates.filter(
        (e) =>
          e.ownerId === (currentUser?.id ?? '') ||
          e.sponsorUserId === (currentUser?.id ?? '') ||
          invitedEstateIds.includes(e.id)
      ),
    [allEstates, currentUser?.id, invitedEstateIds]
  );

  function onAdd() {
    if (canCreate) {
      router.push('/(app)/estates/new' as never);
      return;
    }
    openEstateCreatePaywall({
      isCoOwnerElsewhere,
      returnTo: '/(app)/estates/new',
    });
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <ThemedText type="title" style={styles.title}>
          {t('titles.properties')}
        </ThemedText>
        <HostProLockTouchable
          locked={addLocked}
          feature={isCoOwnerElsewhere ? 'estate.createAsCoOwner' : 'estate.create'}
          returnTo="/(app)/estates/new"
          shrinkToContent
          accessibilityRole="button"
          accessibilityLabel={t('estatesList.addEstate')}
          onPress={onAdd}
          style={[styles.addBtn, { backgroundColor: colors.primary }, appTheme.shadows.md]}
          activeOpacity={0.8}
        >
          <IconSymbol name="plus" size={20} color="#fff" />
        </HostProLockTouchable>
      </View>

      {estates.length === 0 ? (
        <EmptyState
          icon="building.2.fill"
          title={t('estatesList.emptyTitle')}
          subtitle={
            invitedEstateIds.length === 0 && !canCreate
              ? t('estatesList.emptyGuestSub')
              : t('estatesList.emptySub')
          }
          actionLabel={canCreate ? t('estatesList.addEstate') : t('estatesList.enterCode')}
          onAction={
            canCreate ? onAdd : () => router.push('/(app)/stays?tab=redeem' as never)
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {estates.map((estate) => {
            const role = currentUser
              ? getEstateActorRole(allEstates, allInvitations, estate.id, currentUser.id, currentUser.email)
              : 'none';
            const coverage = coverageById[estate.id];
            const uncoveredHost =
              (role === 'sponsor' || role === 'owner') && coverage != null && !coverage.covered;
            return (
              <View key={estate.id} style={styles.cardWrap}>
                <EstateCard
                  estate={estate}
                  onPress={() => router.push(`/(app)/estates/${estate.id}` as never)}
                />
                {uncoveredHost && role === 'owner' && (
                  <View style={[styles.downgradeBadge, { backgroundColor: colors.borderSoft }]}>
                    <ThemedText style={[styles.downgradeText, { color: colors.textMuted }]}>
                      {`Paused — ${coverage?.sponsorDisplayName ?? 'sponsor'}'s plan ended`}
                    </ThemedText>
                  </View>
                )}
                {(role === 'owner' || role === 'guest') && (
                  <View style={[styles.roleBadge, { backgroundColor: colors.icon + '15' }]}>
                    <ThemedText style={[styles.roleBadgeText, { color: colors.icon }]}>
                      {role === 'owner'
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
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 12,
  },
  title: { flex: 1, flexShrink: 1, fontSize: 28, fontWeight: '700', paddingRight: 8 },
  container: { flex: 1 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: 20, gap: 16 },
  cardWrap: { position: 'relative' },
  downgradeBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  downgradeText: { fontSize: 11, fontWeight: '600', flex: 1 },
  roleBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },
});
