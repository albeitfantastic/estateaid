import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  MaintenanceList,
  useMaintenanceEvents,
} from '@/components/maintenance/maintenance-list';
import { EmptyState } from '@/components/ui/empty-state';
import { EstatePickerSheet } from '@/components/ui/estate-picker-sheet';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenScroll, ScreenShell, useScreenTheme } from '@/components/ui/screen-layout';
import { useCan, useManagedEstates } from '@/lib/entitlements/capabilities';
import { openHostCapabilityDenied } from '@/lib/entitlements/host-gate';

type AddFlow = 'maintenance' | 'issue' | null;

/**
 * Cross-property maintenance overview. Reached from Home and the `maintenance` push
 * deep link; per-property maintenance lives on the property hub.
 */
export default function GlobalMaintenanceScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const can = useCan();
  const { estates } = useManagedEstates();
  const events = useMaintenanceEvents();

  const [addFlow, setAddFlow] = useState<AddFlow>(null);

  const writableEstates = useMemo(
    () => estates.filter((e) => can('events.write', e.id)),
    [estates, can]
  );

  function startAdd(flow: Exclude<AddFlow, null>) {
    if (writableEstates.length === 0) {
      const fallbackId = estates[0]?.id;
      if (fallbackId) openHostCapabilityDenied(fallbackId, 'events.write', '/(app)/maintenance');
      return;
    }
    if (writableEstates.length === 1) {
      openNew(writableEstates[0].id, flow);
      return;
    }
    setAddFlow(flow);
  }

  function openNew(estateId: string, flow: Exclude<AddFlow, null>) {
    const q = flow === 'issue' ? '?kind=issue' : '';
    router.push(`/(app)/estates/${estateId}/events/new${q}` as never);
  }

  const hasEstates = estates.length > 0;

  return (
    <ScreenShell
      title={t('maintenanceOverview.screenTitle')}
      headerRight={
        hasEstates ? (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.addBtn,
                {
                  backgroundColor: colors.tint + '22',
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.tint + '55',
                },
              ]}
              onPress={() => startAdd('issue')}
              activeOpacity={0.8}
              accessibilityLabel={t('maintenanceOverview.addIssue')}
            >
              <IconSymbol name="exclamationmark.triangle.fill" size={18} color={colors.tint} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.tint }]}
              onPress={() => startAdd('maintenance')}
              activeOpacity={0.8}
              accessibilityLabel={t('maintenanceOverview.addMaintenance')}
            >
              <IconSymbol name="plus" size={18} color={colors.textOnBrand} />
            </TouchableOpacity>
          </View>
        ) : undefined
      }
    >
      <EstatePickerSheet
        visible={addFlow !== null}
        estates={writableEstates}
        onPick={(estateId) => {
          const flow = addFlow;
          setAddFlow(null);
          if (flow) openNew(estateId, flow);
        }}
        onClose={() => setAddFlow(null)}
      />

      {!hasEstates ? (
        <EmptyState
          icon="building.2.fill"
          title={t('maintenanceOverview.emptyNoEstatesTitle')}
          subtitle={t('maintenanceOverview.emptyNoEstatesSub')}
          actionLabel={t('tabs.properties')}
          onAction={() => router.push('/(app)/estates' as never)}
        />
      ) : events.length === 0 ? (
        <EmptyState
          icon="calendar.badge.plus"
          title={t('maintenanceOverview.emptyEventsTitle')}
          subtitle={t('maintenanceOverview.emptyEventsSub')}
          actionLabel={t('maintenanceSchedule.addCta')}
          onAction={() => startAdd('maintenance')}
        />
      ) : (
        <ScreenScroll>
          <MaintenanceList />
        </ScreenScroll>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
