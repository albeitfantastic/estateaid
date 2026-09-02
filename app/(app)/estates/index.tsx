import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { PropertyUsageBar } from '@/components/estates/property-usage-bar';
import { EstateCard } from '@/components/ui/estate-card';
import { BootstrapErrorBanner } from '@/components/ui/bootstrap-error-banner';
import { EmptyState } from '@/components/ui/empty-state';
import {
  OutlineButton,
  ScreenScroll,
  ScreenShell,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/theme';
import { useAccountContext, useCan, useManagedEstates } from '@/lib/entitlements/capabilities';
import { openEstateCreatePaywall } from '@/lib/maison-pro-upgrade';
import { openEstateHub } from '@/lib/open-estate-hub';
import { useEstateCoverageStore } from '@/store/estate-coverage-store';
import { useEstateStore } from '@/store/estate-store';

export default function EstatesList() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const allEstates = useEstateStore((s) => s.estates);
  const coverageById = useEstateCoverageStore((s) => s.byId);
  const { estates: managedEstates, roleById } = useManagedEstates();
  const can = useCan();
  const canCreate = can('property.create');
  const { slotCount, propertiesSponsored } = useAccountContext();

  const invitedCount = useMemo(
    () => allEstates.filter((e) => {
      const role = roleById[e.id];
      return role === 'owner' || role === 'guest';
    }).length,
    [allEstates, roleById]
  );

  const isCoOwnerElsewhere = useMemo(
    () => Object.values(roleById).some((role) => role === 'owner'),
    [roleById]
  );

  const estates = useMemo(() => {
    const guestEstates = allEstates.filter((e) => roleById[e.id] === 'guest');
    const seen = new Set(managedEstates.map((e) => e.id));
    return [...managedEstates, ...guestEstates.filter((e) => !seen.has(e.id))];
  }, [allEstates, managedEstates, roleById]);

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

  const usageBar = (
    <PropertyUsageBar
      sponsoredUsed={propertiesSponsored}
      sponsoredTotal={slotCount}
      invitedCount={invitedCount}
    />
  );

  return (
    <ScreenShell title={t('titles.properties')} showBack={false}>
      <BootstrapErrorBanner />
      {estates.length === 0 ? (
        <>
          <View style={styles.emptyUsage}>{usageBar}</View>
          <EmptyState
            icon="building.2.fill"
            title={t('estatesList.emptyTitle')}
            subtitle={
              managedEstates.length === 0 && !canCreate
                ? t('estatesList.emptyGuestSub')
                : t('estatesList.emptySub')
            }
            actionLabel={canCreate ? t('estatesList.addEstate') : t('estatesList.enterCode')}
            onAction={canCreate ? onAdd : () => router.push('/(app)/estates/join' as never)}
          />
        </>
      ) : (
        <ScreenScroll contentContainerStyle={styles.list} gap={0} scrollToTopOnFocus>
          {usageBar}
          {estates.map((estate) => {
            const role = roleById[estate.id] ?? 'none';
            const coverage = coverageById[estate.id];
            const uncoveredHost =
              (role === 'sponsor' || role === 'owner') && coverage != null && !coverage.covered;
            return (
              <View key={estate.id} style={styles.cardWrap}>
                <EstateCard
                  estate={estate}
                  onPress={() => openEstateHub(estate.id)}
                />
                {uncoveredHost && role === 'owner' && (
                  <View style={[styles.downgradeBadge, { backgroundColor: colors.border }]}>
                    <ThemedText style={[styles.downgradeText, { color: colors.textSecondary }]}>
                      {t('estatesListExtras.pausedPlanEnded', {
                        name: coverage?.sponsorDisplayName ?? t('estatesListExtras.sponsorFallback'),
                      })}
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
          <OutlineButton
            label={t('estatesList.joinWithCode')}
            icon="ticket.fill"
            onPress={() => router.push('/(app)/estates/join' as never)}
          />
          <OutlineButton
            label={t('estatesList.addEstate')}
            icon="plus"
            onPress={onAdd}
          />
        </ScreenScroll>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: 20, paddingTop: 8 },
  emptyUsage: { paddingHorizontal: Layout.screenPaddingX, paddingTop: 8 },
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
