import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  EstateEvent,
  EstateEventMessage,
  IssuePriority,
  IssueStatus,
} from '@/types';
import { supabase } from '@/lib/supabase';
import { dedupeById } from '@/lib/dedup-by-id';
import { isIssueTask, messagesToDb, normalizeEventMessages } from '@/lib/issue-task';
import { useEstateStore } from '@/store/estate-store';
import { getPushToken, sendPush } from '@/lib/notifications';

function statusFromDb(raw: unknown): IssueStatus | undefined {
  const s = typeof raw === 'string' ? raw : 'open';
  if (s === 'closed') return 'resolved';
  if (s === 'open' || s === 'in_progress' || s === 'resolved') return s;
  return 'open';
}

function fromDb(row: Record<string, unknown>): EstateEvent {
  const id = row.id as string;
  const type = row.type as EstateEvent['type'];
  const rawKind = row.task_kind as EstateEvent['taskKind'] | null | undefined;
  const effectiveTaskKind =
    type === 'task' ? (rawKind ?? 'calendar') : null;
  const messagesRaw = row.messages;
  return {
    id,
    estateId: row.estate_id as string,
    title: row.title as string,
    description: (row.description as string | undefined) || undefined,
    type,
    taskKind: effectiveTaskKind,
    date: row.date as string | undefined,
    recurrence: row.recurrence as EstateEvent['recurrence'] | undefined,
    color: row.color as string | undefined,
    createdAt: (row.created_at ?? '') as string,
    guestId: effectiveTaskKind === 'issue' ? (row.guest_id as string) : undefined,
    status: effectiveTaskKind === 'issue' ? statusFromDb(row.status) : undefined,
    priority:
      effectiveTaskKind === 'issue'
        ? ((row.priority as IssuePriority | undefined) ?? 'normal')
        : undefined,
    assigneeId:
      effectiveTaskKind === 'issue' ? (row.assignee_id as string | undefined) : undefined,
    messages:
      effectiveTaskKind === 'issue'
        ? normalizeEventMessages(messagesRaw, id)
        : undefined,
    updatedAt: (row.updated_at as string | undefined) || undefined,
  };
}

function toDb(e: EstateEvent) {
  const taskKind =
    e.type === 'task' ? (e.taskKind ?? 'calendar') : null;
  return {
    id: e.id,
    estate_id: e.estateId,
    title: e.title,
    description: e.description ?? null,
    type: e.type,
    task_kind: taskKind,
    date: e.date ?? null,
    recurrence: e.recurrence ?? null,
    color: e.color ?? null,
    created_at: e.createdAt,
    guest_id: e.guestId ?? null,
    status: isIssueTask(e) ? e.status ?? 'open' : null,
    priority: isIssueTask(e) ? e.priority ?? 'normal' : null,
    assignee_id: e.assigneeId ?? null,
    messages: isIssueTask(e) ? messagesToDb(e.messages ?? []) : [],
    updated_at: e.updatedAt ?? e.createdAt,
  };
}

interface EventState {
  events: EstateEvent[];
  setEvents: (events: EstateEvent[]) => void;
  fetchFromSupabase: () => Promise<void>;
  addEvent: (event: EstateEvent) => Promise<{ error: string | null }>;
  updateEvent: (id: string, patch: Partial<EstateEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEventsByEstate: (estateId: string) => EstateEvent[];
  addIssueMessage: (eventId: string, message: EstateEventMessage) => Promise<void>;
  updateIssueMessage: (
    eventId: string,
    messageId: string,
    patch: { body?: string; taggedContactId?: string | null }
  ) => Promise<void>;
  updateIssueStatus: (eventId: string, status: IssueStatus) => Promise<void>;
  updateIssueFields: (
    eventId: string,
    patch: { date?: string | null; title?: string; priority?: IssuePriority }
  ) => Promise<void>;
}

export const useEventStore = create<EventState>()(
  persist(
    (set, get) => ({
      events: [],
      setEvents: (events) => set({ events }),
      fetchFromSupabase: async () => {
        const { data, error } = await supabase.from('estate_events').select('*');
        if (error) {
          console.warn('event-store fetchFromSupabase:', error.message);
          return;
        }
        if (!data) return;
        set({ events: dedupeById(data).map(fromDb) });
      },
      addEvent: async (event) => {
        const normalized: EstateEvent =
          event.type === 'task'
            ? {
                ...event,
                taskKind: event.taskKind ?? 'calendar',
                messages: event.taskKind === 'issue' ? event.messages ?? [] : [],
                updatedAt: event.updatedAt ?? event.createdAt,
              }
            : { ...event, taskKind: null, messages: undefined };
        set((s) => ({ events: [...s.events, normalized] }));
        const { error } = await supabase.from('estate_events').insert(toDb(normalized));
        if (error) {
          set((s) => ({ events: s.events.filter((e) => e.id !== event.id) }));
          return { error: error.message };
        }
        return { error: null };
      },
      updateEvent: async (id, patch) => {
        const updatedAt = new Date().toISOString();
        set((s) => ({
          events: s.events.map((e) =>
            e.id === id ? { ...e, ...patch, updatedAt: patch.updatedAt ?? updatedAt } : e
          ),
        }));
        const ev = get().events.find((e) => e.id === id);
        const dbPatch: Record<string, unknown> = {};
        if (patch.title !== undefined) dbPatch.title = patch.title;
        if (patch.description !== undefined) dbPatch.description = patch.description;
        if (patch.type !== undefined) dbPatch.type = patch.type;
        if (patch.taskKind !== undefined) dbPatch.task_kind = patch.taskKind;
        if (patch.date !== undefined) dbPatch.date = patch.date;
        if (patch.recurrence !== undefined) dbPatch.recurrence = patch.recurrence;
        if (patch.color !== undefined) dbPatch.color = patch.color;
        if (patch.guestId !== undefined) dbPatch.guest_id = patch.guestId;
        if (patch.status !== undefined) dbPatch.status = patch.status;
        if (patch.priority !== undefined) dbPatch.priority = patch.priority;
        if (patch.assigneeId !== undefined) dbPatch.assignee_id = patch.assigneeId;
        if (patch.messages !== undefined && ev && isIssueTask(ev))
          dbPatch.messages = messagesToDb(patch.messages);
        dbPatch.updated_at = ev?.updatedAt ?? updatedAt;
        if (Object.keys(dbPatch).length > 0) {
          await supabase.from('estate_events').update(dbPatch).eq('id', id);
        }
      },
      deleteEvent: async (id) => {
        set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
        await supabase.from('estate_events').delete().eq('id', id);
      },
      getEventsByEstate: (estateId) => get().events.filter((e) => e.estateId === estateId),

      addIssueMessage: async (eventId, message) => {
        const updatedAt = new Date().toISOString();
        set((s) => ({
          events: s.events.map((e) =>
            e.id === eventId && isIssueTask(e)
              ? { ...e, messages: [...(e.messages ?? []), message], updatedAt }
              : e
          ),
        }));
        const ev = get().events.find((x) => x.id === eventId);
        if (ev && isIssueTask(ev)) {
          await supabase
            .from('estate_events')
            .update({
              messages: messagesToDb(ev.messages ?? []),
              updated_at: ev.updatedAt,
              date: ev.date ?? null,
            })
            .eq('id', eventId);
          const estate = useEstateStore.getState().estates.find((e) => e.id === ev.estateId);
          const recipientId = message.authorId === estate?.ownerId ? ev.guestId : estate?.ownerId;
          if (recipientId) {
            void getPushToken(recipientId).then((token) =>
              sendPush(token, `New message: ${ev.title}`, message.body.slice(0, 120), {
                estateId: ev.estateId,
                eventId,
              })
            );
          }
        }
      },
      updateIssueMessage: async (eventId, messageId, patch) => {
        const updatedAt = new Date().toISOString();
        set((s) => ({
          events: s.events.map((e) => {
            if (e.id !== eventId || !isIssueTask(e)) return e;
            return {
              ...e,
              updatedAt,
              messages: (e.messages ?? []).map((m) => {
                if (m.id !== messageId) return m;
                const next = { ...m };
                if (patch.body !== undefined) next.body = patch.body.trim();
                if (patch.taggedContactId !== undefined) {
                  next.taggedContactId =
                    patch.taggedContactId === null || patch.taggedContactId === ''
                      ? undefined
                      : patch.taggedContactId;
                }
                return next;
              }),
            };
          }),
        }));
        const ev = get().events.find((x) => x.id === eventId);
        if (ev && isIssueTask(ev)) {
          await supabase
            .from('estate_events')
            .update({
              messages: messagesToDb(ev.messages ?? []),
              updated_at: ev.updatedAt,
              date: ev.date ?? null,
            })
            .eq('id', eventId);
        }
      },
      updateIssueFields: async (eventId, patch) => {
        const updatedAt = new Date().toISOString();
        set((s) => ({
          events: s.events.map((e) => {
            if (e.id !== eventId || !isIssueTask(e)) return e;
            const next = { ...e, updatedAt };
            if ('date' in patch) {
              next.date =
                patch.date === null || patch.date === undefined || patch.date === ''
                  ? undefined
                  : patch.date;
            }
            if (patch.title !== undefined) next.title = patch.title.trim() || e.title;
            if (patch.priority !== undefined) next.priority = patch.priority;
            return next;
          }),
        }));
        const dbPatch: Record<string, unknown> = { updated_at: updatedAt };
        if ('date' in patch) {
          dbPatch.date =
            patch.date === null || patch.date === undefined || patch.date === ''
              ? null
              : patch.date;
        }
        if (patch.title !== undefined) {
          const e = get().events.find((x) => x.id === eventId);
          if (e) dbPatch.title = e.title;
        }
        if (patch.priority !== undefined) dbPatch.priority = patch.priority;
        await supabase.from('estate_events').update(dbPatch).eq('id', eventId);
      },
      updateIssueStatus: async (eventId, status) => {
        const updatedAt = new Date().toISOString();
        set((s) => ({
          events: s.events.map((e) =>
            e.id === eventId && isIssueTask(e) ? { ...e, status, updatedAt } : e
          ),
        }));
        await supabase
          .from('estate_events')
          .update({ status, updated_at: updatedAt })
          .eq('id', eventId);
      },
    }),
    {
      name: '@estateaid/events',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
