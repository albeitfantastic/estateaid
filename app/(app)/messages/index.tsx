import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/empty-state';
import {
  GroupedList,
  GroupedRow,
  ScreenScroll,
  ScreenShell,
} from '@/components/ui/screen-layout';
import { useAccessibleEstates } from '@/lib/entitlements/capabilities';
import { unseenInboxCountForEstate } from '@/lib/inbox-messages';
import { useEventStore } from '@/store/event-store';
import { useInboxSeenStore } from '@/store/inbox-seen-store';
import { useStayStore } from '@/store/stay-store';

export default function MessagesIndex() {
  const { t } = useTranslation();
  const router = useRouter();
  const estates = useAccessibleEstates();
  const events = useEventStore((s) => s.events);
  const stayRequests = useStayStore((s) => s.stayRequests);
  const seenAt = useInboxSeenStore((s) => s.seenAt);

  const rows = useMemo(
    () =>
      estates
        .map((estate) => ({
          estate,
          count: unseenInboxCountForEstate(estate.id, events, stayRequests, seenAt),
        }))
        .filter((row) => row.count > 0),
    [estates, events, stayRequests, seenAt]
  );

  return (
    <ScreenShell title={t('messagesInbox.title')}>
      {rows.length === 0 ? (
        <EmptyState
          icon="message"
          title={t('messagesInbox.emptyTitle')}
          subtitle={t('messagesInbox.emptySub')}
        />
      ) : (
        <ScreenScroll contentContainerStyle={styles.scroll} gap={16}>
          <GroupedList>
            {rows.map((row, i) => (
              <GroupedRow
                key={row.estate.id}
                icon="building.2.fill"
                title={row.estate.name}
                subtitle={t('messagesInbox.count', { count: row.count })}
                onPress={() => router.push(`/(app)/messages/${row.estate.id}` as never)}
                isLast={i === rows.length - 1}
              />
            ))}
          </GroupedList>
        </ScreenScroll>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 8 },
});
