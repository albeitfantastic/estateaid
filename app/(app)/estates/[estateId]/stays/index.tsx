import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  StayRequestsList,
  useIncomingStayRequests,
} from '@/components/stays/stay-requests-list';
import { EmptyState } from '@/components/ui/empty-state';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { ScreenScroll, ScreenShell } from '@/components/ui/screen-layout';

type Filter = 'pending' | 'all';

export default function StayRequestsScreen() {
  const { t } = useTranslation();
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const [filter, setFilter] = useState<Filter>('pending');
  const requests = useIncomingStayRequests(estateId, filter);

  return (
    <ScreenShell title={t('titles.stayRequests')}>
      <SegmentedControl<Filter>
        segments={[
          { key: 'pending', label: t('stayRequestsList.filterPending') },
          { key: 'all', label: t('stayRequestsList.filterAll') },
        ]}
        value={filter}
        onChange={setFilter}
      />
      {requests.length === 0 ? (
        <EmptyState
          icon="tray.fill"
          title={
            filter === 'pending'
              ? t('stayRequestsList.emptyPendingTitle')
              : t('stayRequestsList.emptyAllTitle')
          }
        />
      ) : (
        <ScreenScroll>
          <StayRequestsList estateId={estateId} mode="incoming" statusFilter={filter} />
        </ScreenScroll>
      )}
    </ScreenShell>
  );
}
