import type { EstateEvent, EstateEventMessage, IssueStatus } from '@/types';

export function isIssueTask(e: EstateEvent): boolean {
  return e.type === 'task' && e.taskKind === 'issue';
}

export function isCalendarTask(e: EstateEvent): boolean {
  return e.type === 'task' && (e.taskKind === 'calendar' || e.taskKind == null);
}

export function isIssueOpenForCalendar(e: EstateEvent): boolean {
  return (
    isIssueTask(e) &&
    !!e.date &&
    (e.status === 'open' || e.status === 'in_progress')
  );
}

export function isIssueOpenStatus(s: IssueStatus | undefined): boolean {
  return s === 'open' || s === 'in_progress';
}

/** Normalize DB JSON (legacy `ticketId`) to `eventId`. */
export function normalizeEventMessages(raw: unknown, eventId: string): EstateEventMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((m) => {
    const row = m as Record<string, unknown>;
    const id = String(row.id ?? '');
    const evId = String(row.eventId ?? row.ticketId ?? eventId);
    return {
      id,
      eventId: evId,
      authorId: String(row.authorId ?? ''),
      body: String(row.body ?? ''),
      attachmentUris: row.attachmentUris as string[] | undefined,
      createdAt: String(row.createdAt ?? ''),
      taggedContactId:
        row.taggedContactId === null || row.taggedContactId === ''
          ? undefined
          : (row.taggedContactId as string),
      taggedHostId:
        row.taggedHostId === null || row.taggedHostId === ''
          ? undefined
          : (row.taggedHostId as string),
    };
  });
}

export function messagesToDb(messages: EstateEventMessage[]): unknown[] {
  return messages.map((m) => ({
    id: m.id,
    eventId: m.eventId,
    authorId: m.authorId,
    body: m.body,
    attachmentUris: m.attachmentUris,
    createdAt: m.createdAt,
    taggedContactId: m.taggedContactId,
    taggedHostId: m.taggedHostId,
  }));
}
