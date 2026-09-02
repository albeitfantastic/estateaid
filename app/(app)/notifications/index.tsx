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
import { formatDate } from '@/lib/date-utils';
import { useAccessibleEstates } from '@/lib/entitlements/capabilities';
import {
  composeNotificationFeed,
  unseenNotificationFeed,
  type NotificationFeedItem,
} from '@/lib/notification-feed';
import { useActivityLogStore } from '@/store/activity-log-store';
import { useAuthStore } from '@/store/auth-store';
import { useContactStore } from '@/store/contact-store';
import { useDocumentStore } from '@/store/document-store';
import { useEstateStore } from '@/store/estate-store';
import { useEventStore } from '@/store/event-store';
import { useInboxSeenStore } from '@/store/inbox-seen-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { useStayStore } from '@/store/stay-store';

function formatWhen(iso: string): string {
  const day = iso.slice(0, 10);
  return day ? formatDate(day) : iso;
}

function feedIcon(kind: NotificationFeedItem['kind']): string {
  switch (kind) {
    case 'stay_request_created':
    case 'stay_request_approved':
    case 'stay_request_declined':
    case 'stay_request_alternative_proposed':
    case 'stay_request_cancelled':
      return 'calendar';
    case 'task_created':
      return 'wrench.fill';
    case 'document_added':
      return 'doc.fill';
    case 'contact_added':
      return 'phone.fill';
    case 'invitation_sent':
    case 'invitation_accepted':
    case 'invitation_declined':
    case 'invitation_revoked':
      return 'person.badge.plus';
    default:
      return 'building.2.fill';
  }
}

function feedTitle(
  item: NotificationFeedItem,
  actorName: string,
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  switch (item.kind) {
    case 'stay_request_created':
      return t('activityFeed.stayRequestCreated', { name: actorName });
    case 'stay_request_approved':
      return t('activityFeed.stayRequestApproved', { name: actorName });
    case 'stay_request_declined':
      return t('activityFeed.stayRequestDeclined', { name: actorName });
    case 'stay_request_alternative_proposed':
      return t('activityFeed.stayRequestAlternative', { name: actorName });
    case 'stay_request_cancelled':
      return t('activityFeed.stayRequestCancelled', { name: actorName });
    case 'task_created':
      return t('activityFeed.taskCreated', { name: actorName });
    case 'document_added':
      return t('activityFeed.documentAdded', { name: actorName });
    case 'contact_added':
      return item.actorId
        ? t('activityFeed.contactAdded', { name: actorName })
        : t('activityFeed.contactAddedNoActor', { title: item.titleHint ?? '' });
    case 'estate_created':
      return t('activityFeed.estateCreated', { name: actorName });
    case 'estate_updated':
      return t('activityFeed.estateUpdated', { name: actorName });
    case 'invitation_sent':
      return t('activityFeed.invitationSent', { name: actorName });
    case 'invitation_accepted':
      return t('activityFeed.invitationAccepted', { name: actorName });
    case 'invitation_declined':
      return t('activityFeed.invitationDeclined', { name: actorName });
    case 'invitation_revoked':
      return t('activityFeed.invitationRevoked', { name: actorName });
    default:
      return actorName;
  }
}

export default function NotificationsFeed() {
  const { t } = useTranslation();
  const router = useRouter();
  const currentUserId = useAuthStore((s) => s.currentUser?.id);
  const estates = useAccessibleEstates();
  const estateIds = useMemo(() => estates.map((e) => e.id), [estates]);
  const estateById = useMemo(
    () => Object.fromEntries(estates.map((e) => [e.id, e] as const)),
    [estates]
  );
  const log = useActivityLogStore((s) => s.entries);
  const stayRequests = useStayStore((s) => s.stayRequests);
  const events = useEventStore((s) => s.events);
  const documents = useDocumentStore((s) => s.documents);
  const contacts = useContactStore((s) => s.contacts);
  const profileById = useProfileStore((s) => s.byId);
  const getEstateById = useEstateStore((s) => s.getEstateById);
  const seenAt = useInboxSeenStore((s) => s.seenAt);
  const markSeen = useInboxSeenStore((s) => s.markSeen);

  const items = useMemo(
    () =>
      unseenNotificationFeed(
        composeNotificationFeed({
          estateIds,
          log,
          stayRequests,
          events,
          documents,
          contacts,
        }),
        seenAt
      ),
    [estateIds, log, stayRequests, events, documents, contacts, seenAt]
  );

  return (
    <ScreenShell title={t('activityFeed.title')}>
      {items.length === 0 ? (
        <EmptyState
          icon="bell"
          title={t('activityFeed.emptyTitle')}
          subtitle={t('activityFeed.emptySub')}
        />
      ) : (
        <ScreenScroll contentContainerStyle={styles.scroll} gap={16}>
          <GroupedList>
            {items.map((item, i) => {
              const actorName = item.actorId
                ? item.actorId === currentUserId
                  ? t('common.you')
                  : resolveUserDisplayName(item.actorId, profileById)
                : t('activityFeed.someone');
              const estateName =
                estateById[item.estateId]?.name ??
                getEstateById(item.estateId)?.name ??
                t('common.unknownEstate');
              const bits = [estateName, formatWhen(item.createdAt)];
              if (item.titleHint && item.kind !== 'contact_added') bits.push(item.titleHint);
              return (
                <GroupedRow
                  key={item.id}
                  icon={feedIcon(item.kind)}
                  title={feedTitle(item, actorName, t)}
                  subtitle={bits.join(' · ')}
                  onPress={
                    item.href
                      ? () => {
                          markSeen(item.seenKey);
                          router.push(item.href as never);
                        }
                      : undefined
                  }
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
