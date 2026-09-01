import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  MaintenanceAddButtons,
  MaintenanceList,
  useMaintenanceEvents,
} from '@/components/maintenance/maintenance-list';
import { EmptyState } from '@/components/ui/empty-state';
import { EstatePickerSheet } from '@/components/ui/estate-picker-sheet';
import { ScreenScroll, ScreenShell } from '@/components/ui/screen-layout';
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
    <ScreenShell title={t('maintenanceOverview.screenTitle')}>
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
      ) : (
        <ScreenScroll>
          <MaintenanceAddButtons
            onAddTask={() => startAdd('issue')}
            onAddRoutine={() => startAdd('maintenance')}
          />
          {events.length === 0 ? (
            <EmptyState
              title={t('maintenanceOverview.emptyEventsTitle')}
              subtitle={t('maintenanceOverview.emptyEventsSub')}
            />
          ) : (
            <MaintenanceList />
          )}
        </ScreenScroll>
      )}
    </ScreenShell>
  );
}
