import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/empty-state';
import {
  GroupedList,
  GroupedRow,
  ScreenScroll,
  ScreenShell,
} from '@/components/ui/screen-layout';
import { formatDate } from '@/lib/date-utils';
import { unseenInboxThreads } from '@/lib/inbox-messages';
import { openEstateEvent } from '@/lib/open-estate-hub';
import { useEstateStore } from '@/store/estate-store';
import { useEventStore } from '@/store/event-store';
import { markInboxSeen, useInboxSeenStore } from '@/store/inbox-seen-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { useStayStore } from '@/store/stay-store';

function paramId(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return '';
}

function formatWhen(iso: string): string {
  const day = iso.slice(0, 10);
  return day ? formatDate(day) : iso;
}

export default function MessagesForEstate() {
  const { t } = useTranslation();
  const router = useRouter();
  const estateId = paramId(useLocalSearchParams<{ estateId: string | string[] }>().estateId);
  const getEstateById = useEstateStore((s) => s.getEstateById);
  const estate = getEstateById(estateId);
  const events = useEventStore((s) => s.events);
  const stayRequests = useStayStore((s) => s.stayRequests);
  const profileById = useProfileStore((s) => s.byId);
  const seenAt = useInboxSeenStore((s) => s.seenAt);

  const items = useMemo(
    () => unseenInboxThreads(estateId, events, stayRequests, seenAt),
    [estateId, events, stayRequests, seenAt]
  );

  return (
    <ScreenShell title={estate?.name ?? t('messagesInbox.title')}>
      {items.length === 0 ? (
        <EmptyState
          icon="message"
          title={t('messagesInbox.emptyTitle')}
          subtitle={t('messagesInbox.emptySub')}
        />
      ) : (
        <ScreenScroll contentContainerStyle={styles.scroll} gap={16}>
          <GroupedList>
            {items.map((item, i) => {
              const author = item.authorId
                ? resolveUserDisplayName(item.authorId, profileById)
                : undefined;
              const kindLabel =
                item.kind === 'task' ? t('messagesInbox.taskLabel') : t('messagesInbox.requestLabel');
              const subtitleBits = [kindLabel, author, formatWhen(item.createdAt)].filter(Boolean);
              return (
                <GroupedRow
                  key={item.id}
                  icon={item.kind === 'task' ? 'wrench.fill' : 'calendar'}
                  title={item.title}
                  subtitle={
                    item.body
                      ? `${subtitleBits.join(' · ')} · ${item.body}`
                      : subtitleBits.join(' · ')
                  }
                  onPress={() => {
                    if (item.kind === 'task' && item.eventId) {
                      markInboxSeen('task', item.eventId);
                      openEstateEvent(item.estateId, item.eventId);
                      return;
                    }
                    if (item.requestId) {
                      markInboxSeen('request', item.requestId);
                      router.push(
                        `/(app)/estates/${item.estateId}/stays/${item.requestId}` as never
                      );
                    }
                  }}
                  isLast={i === items.length - 1}
                />
              );
            })}
          </GroupedList>
        </ScreenScroll>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 8 },
});
