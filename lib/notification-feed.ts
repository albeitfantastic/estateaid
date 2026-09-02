import { pathForNotificationData } from '@/lib/notifications';
import { inboxSeenKey, isInboxUnseen, type InboxSeenKind } from '@/store/inbox-seen-store';
import type {
  EstateActivityAction,
  EstateActivityEntry,
  EstateContact,
  EstateDocument,
  EstateEvent,
  StayRequest,
} from '@/types';

export type NotificationFeedKind = EstateActivityAction;

export type NotificationFeedItem = {
  id: string;
  estateId: string;
  createdAt: string;
  actorId?: string;
  kind: NotificationFeedKind;
  titleHint?: string;
  href: string | null;
  /** Shared with messages so opening a task/request from anywhere clears both. */
  seenKey: string;
};

function metaString(entry: EstateActivityEntry, key: string): string | undefined {
  const v = entry.metadata?.[key];
  return typeof v === 'string' && v.trim() ? v : undefined;
}

function targetForAction(
  kind: NotificationFeedKind,
  estateId: string,
  ids: {
    requestId?: string;
    eventId?: string;
    documentId?: string;
    contactId?: string;
    fallbackId?: string;
  }
): { seenKind: InboxSeenKind; id: string } {
  switch (kind) {
    case 'stay_request_created':
    case 'stay_request_approved':
    case 'stay_request_declined':
    case 'stay_request_alternative_proposed':
    case 'stay_request_cancelled':
      return { seenKind: 'request', id: ids.requestId ?? ids.fallbackId ?? estateId };
    case 'task_created':
      return { seenKind: 'task', id: ids.eventId ?? ids.fallbackId ?? estateId };
    case 'document_added':
      return { seenKind: 'doc', id: ids.documentId ?? ids.fallbackId ?? estateId };
    case 'contact_added':
      return { seenKind: 'contact', id: ids.contactId ?? ids.fallbackId ?? estateId };
    case 'invitation_sent':
    case 'invitation_accepted':
    case 'invitation_declined':
    case 'invitation_revoked':
      return { seenKind: 'guests', id: estateId };
    default:
      return { seenKind: 'estate', id: estateId };
  }
}

function hrefFor(
  kind: NotificationFeedKind,
  estateId: string,
  ids: { requestId?: string; eventId?: string; documentId?: string; contactId?: string }
): string | null {
  switch (kind) {
    case 'stay_request_created':
    case 'stay_request_approved':
    case 'stay_request_declined':
    case 'stay_request_alternative_proposed':
    case 'stay_request_cancelled':
      return pathForNotificationData({
        type: kind === 'stay_request_created' ? 'stay_request' : 'stay_decision',
        estateId,
        requestId: ids.requestId,
      });
    case 'task_created':
      return pathForNotificationData({ type: 'maintenance', estateId, eventId: ids.eventId });
    case 'document_added':
      return ids.documentId
        ? `/(app)/estates/${estateId}/documents/${ids.documentId}`
        : `/(app)/estates/${estateId}/documents`;
    case 'contact_added':
      return ids.contactId
        ? `/(app)/estates/${estateId}/contacts/${ids.contactId}/edit`
        : `/(app)/estates/${estateId}/contacts`;
    case 'invitation_sent':
    case 'invitation_accepted':
    case 'invitation_declined':
    case 'invitation_revoked':
      return pathForNotificationData({ type: 'invite_accepted', estateId });
    case 'estate_created':
    case 'estate_updated':
      return `/(app)/estates/${estateId}`;
    default:
      return estateId ? `/(app)/estates/${estateId}` : null;
  }
}

function fromLog(entry: EstateActivityEntry): NotificationFeedItem {
  const requestId = metaString(entry, 'requestId');
  const eventId = metaString(entry, 'eventId');
  const documentId = metaString(entry, 'documentId');
  const contactId = metaString(entry, 'contactId');
  const titleHint =
    metaString(entry, 'title') ?? metaString(entry, 'name') ?? metaString(entry, 'contactName');
  const target = targetForAction(entry.action, entry.estateId, {
    requestId,
    eventId,
    documentId,
    contactId,
    fallbackId: entry.id,
  });
  return {
    id: entry.id,
    estateId: entry.estateId,
    createdAt: entry.createdAt,
    actorId: entry.actorId || undefined,
    kind: entry.action,
    titleHint,
    href: hrefFor(entry.action, entry.estateId, { requestId, eventId, documentId, contactId }),
    seenKey: inboxSeenKey(target.seenKind, target.id),
  };
}

/**
 * Activity feed: prefer `estate_activity_log` rows, then fill gaps from live store
 * records so older creates still appear.
 */
export function composeNotificationFeed(opts: {
  estateIds: string[];
  log: EstateActivityEntry[];
  stayRequests: StayRequest[];
  events: EstateEvent[];
  documents: EstateDocument[];
  contacts: EstateContact[];
}): NotificationFeedItem[] {
  const scope = new Set(opts.estateIds);
  const items: NotificationFeedItem[] = [];

  const loggedRequestIds = new Set<string>();
  const loggedEventIds = new Set<string>();
  const loggedDocumentIds = new Set<string>();
  const loggedContactIds = new Set<string>();

  for (const entry of opts.log) {
    if (!scope.has(entry.estateId)) continue;
    items.push(fromLog(entry));
    const requestId = metaString(entry, 'requestId');
    const eventId = metaString(entry, 'eventId');
    const documentId = metaString(entry, 'documentId');
    const contactId = metaString(entry, 'contactId');
    if (entry.action === 'stay_request_created' && requestId) loggedRequestIds.add(requestId);
    if (entry.action === 'task_created' && eventId) loggedEventIds.add(eventId);
    if (entry.action === 'document_added' && documentId) loggedDocumentIds.add(documentId);
    if (entry.action === 'contact_added' && contactId) loggedContactIds.add(contactId);
  }

  for (const r of opts.stayRequests) {
    if (!scope.has(r.estateId) || loggedRequestIds.has(r.id)) continue;
    items.push({
      id: `stay:${r.id}`,
      estateId: r.estateId,
      createdAt: r.createdAt,
      actorId: r.guestId || undefined,
      kind: 'stay_request_created',
      href: hrefFor('stay_request_created', r.estateId, { requestId: r.id }),
      seenKey: inboxSeenKey('request', r.id),
    });
  }

  for (const ev of opts.events) {
    if (!scope.has(ev.estateId) || loggedEventIds.has(ev.id)) continue;
    if (ev.type !== 'task') continue;
    items.push({
      id: `task:${ev.id}`,
      estateId: ev.estateId,
      createdAt: ev.createdAt,
      actorId: ev.guestId || undefined,
      kind: 'task_created',
      titleHint: ev.title,
      href: hrefFor('task_created', ev.estateId, { eventId: ev.id }),
      seenKey: inboxSeenKey('task', ev.id),
    });
  }

  for (const doc of opts.documents) {
    if (!scope.has(doc.estateId) || loggedDocumentIds.has(doc.id)) continue;
    items.push({
      id: `doc:${doc.id}`,
      estateId: doc.estateId,
      createdAt: doc.createdAt,
      actorId: doc.uploadedBy || undefined,
      kind: 'document_added',
      titleHint: doc.title,
      href: hrefFor('document_added', doc.estateId, { documentId: doc.id }),
      seenKey: inboxSeenKey('doc', doc.id),
    });
  }

  for (const c of opts.contacts) {
    if (!scope.has(c.estateId) || loggedContactIds.has(c.id)) continue;
    items.push({
      id: `contact:${c.id}`,
      estateId: c.estateId,
      createdAt: c.createdAt,
      kind: 'contact_added',
      titleHint: c.name,
      href: hrefFor('contact_added', c.estateId, { contactId: c.id }),
      seenKey: inboxSeenKey('contact', c.id),
    });
  }

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 80);
}

export function unseenNotificationFeed(
  items: NotificationFeedItem[],
  seenAt: Record<string, string>
): NotificationFeedItem[] {
  return items.filter((item) => isInboxUnseen(seenAt, item.seenKey, item.createdAt));
}

export function unseenNotificationCount(
  opts: Parameters<typeof composeNotificationFeed>[0],
  seenAt: Record<string, string>
): number {
  return unseenNotificationFeed(composeNotificationFeed(opts), seenAt).length;
}
