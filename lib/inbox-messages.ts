import { formatDateRange } from '@/lib/date-utils';
import { isIssueTask } from '@/lib/issue-task';
import { inboxSeenKey, isInboxUnseen } from '@/store/inbox-seen-store';
import type { EstateEvent, StayRequest } from '@/types';

export type InboxKind = 'task' | 'request';

/** One row per task thread or stay request. */
export type InboxMessage = {
  id: string;
  estateId: string;
  kind: InboxKind;
  title: string;
  body: string;
  authorId?: string;
  createdAt: string;
  eventId?: string;
  requestId?: string;
};

function latestMessage(ev: EstateEvent): { body: string; authorId?: string; createdAt: string } {
  const msgs = (ev.messages ?? []).filter(
    (m) => m.body.trim() || (m.attachmentUris ?? []).length > 0
  );
  if (msgs.length === 0) {
    return {
      body: (ev.description ?? '').trim(),
      authorId: ev.guestId,
      createdAt: ev.updatedAt || ev.createdAt,
    };
  }
  const latest = msgs.reduce((a, b) => (a.createdAt >= b.createdAt ? a : b));
  return {
    body: latest.body.trim(),
    authorId: latest.authorId || undefined,
    createdAt: latest.createdAt || ev.updatedAt || ev.createdAt,
  };
}

function inboxFromEvents(events: EstateEvent[], estateId: string): InboxMessage[] {
  const items: InboxMessage[] = [];
  for (const ev of events) {
    if (ev.estateId !== estateId || !isIssueTask(ev)) continue;
    const latest = latestMessage(ev);
    items.push({
      id: ev.id,
      estateId,
      kind: 'task',
      title: ev.title,
      body: latest.body,
      authorId: latest.authorId,
      createdAt: latest.createdAt,
      eventId: ev.id,
    });
  }
  return items;
}

function inboxFromRequests(requests: StayRequest[], estateId: string): InboxMessage[] {
  return requests
    .filter((r) => r.estateId === estateId)
    .map((r) => {
      const note = (r.ownerNote ?? r.guestNote ?? '').trim();
      return {
        id: r.id,
        estateId,
        kind: 'request' as const,
        title: formatDateRange(r.requestedFrom, r.requestedTo),
        body: note,
        authorId: note && r.ownerNote?.trim() ? undefined : r.guestId,
        createdAt: r.updatedAt || r.createdAt,
        requestId: r.id,
      };
    });
}

export function inboxThreadsForEstate(
  estateId: string,
  events: EstateEvent[],
  requests: StayRequest[]
): InboxMessage[] {
  return [...inboxFromEvents(events, estateId), ...inboxFromRequests(requests, estateId)].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt)
  );
}

export function unseenInboxThreads(
  estateId: string,
  events: EstateEvent[],
  requests: StayRequest[],
  seenAt: Record<string, string>
): InboxMessage[] {
  return inboxThreadsForEstate(estateId, events, requests).filter((item) => {
    const kind = item.kind === 'task' ? 'task' : 'request';
    const id = item.eventId ?? item.requestId ?? item.id;
    return isInboxUnseen(seenAt, inboxSeenKey(kind, id), item.createdAt);
  });
}

export function unseenInboxCountForEstate(
  estateId: string,
  events: EstateEvent[],
  requests: StayRequest[],
  seenAt: Record<string, string>
): number {
  return unseenInboxThreads(estateId, events, requests, seenAt).length;
}

export function unseenInboxCountAll(
  estateIds: string[],
  events: EstateEvent[],
  requests: StayRequest[],
  seenAt: Record<string, string>
): number {
  return estateIds.reduce(
    (n, id) => n + unseenInboxCountForEstate(id, events, requests, seenAt),
    0
  );
}
