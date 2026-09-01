import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import {
  MaintenanceAddButtons,
  MaintenanceList,
  useMaintenanceEvents,
} from '@/components/maintenance/maintenance-list';
import { EmptyState } from '@/components/ui/empty-state';
import { ScreenScroll, ScreenShell } from '@/components/ui/screen-layout';
import { useCan } from '@/lib/entitlements/capabilities';
import { openHostCapabilityDenied } from '@/lib/entitlements/host-gate';

function paramId(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return '';
}

export default function EventsIndex() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ estateId: string | string[] }>();
  const estateId = paramId(params.estateId);
  const router = useRouter();
  const canWrite = useCan()('events.write', { estateId });
  const events = useMaintenanceEvents(estateId);

  const goNew = (kind?: 'issue') => {
    if (!canWrite) {
      openHostCapabilityDenied(estateId, 'events.write', `/(app)/estates/${estateId}/events/new`);
      return;
    }
    const q = kind === 'issue' ? '?kind=issue' : '';
    router.push(`/(app)/estates/${estateId}/events/new${q}` as never);
  };

  return (
    <ScreenShell title={t('titles.events')}>
      <ScreenScroll>
        <MaintenanceAddButtons
          onAddTask={() => goNew('issue')}
          onAddRoutine={() => goNew()}
        />
        {events.length === 0 ? (
          <EmptyState
            title={t('maintenanceSchedule.emptyTitle')}
            subtitle={t('maintenanceSchedule.emptySub')}
          />
        ) : (
          <MaintenanceList estateId={estateId} />
        )}
      </ScreenScroll>
    </ScreenShell>
  );
}
