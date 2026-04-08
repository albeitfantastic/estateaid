import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ticket, TicketMessage, TicketStatus } from '@/types';
import { supabase } from '@/lib/supabase';
import { dedupeById } from '@/lib/dedup-by-id';

function dueDateFromDb(v: unknown): string | undefined {
  if (v == null || v === '') return undefined;
  if (typeof v === 'string') return v.slice(0, 10);
  return undefined;
}

function statusFromDb(raw: unknown): TicketStatus {
  const s = typeof raw === 'string' ? raw : 'open';
  if (s === 'closed') return 'resolved';
  if (s === 'open' || s === 'in_progress' || s === 'resolved') return s;
  return 'open';
}

function fromDb(row: Record<string, unknown>): Ticket {
  return {
    id: row.id as string,
    estateId: row.estate_id as string,
    guestId: row.guest_id as string,
    title: row.title as string,
    status: statusFromDb(row.status),
    priority: row.priority as Ticket['priority'],
    dueDate: dueDateFromDb(row.due_date),
    assigneeId: row.assignee_id as string | undefined,
    messages: (row.messages ?? []) as TicketMessage[],
    createdAt: (row.created_at ?? '') as string,
    updatedAt: (row.updated_at ?? '') as string,
  };
}

function toDb(t: Ticket) {
  return {
    id: t.id,
    estate_id: t.estateId,
    guest_id: t.guestId,
    title: t.title,
    status: t.status,
    priority: t.priority,
    due_date: t.dueDate ?? null,
    assignee_id: t.assigneeId ?? null,
    messages: t.messages,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

interface TicketState {
  tickets: Ticket[];
  setTickets: (tickets: Ticket[]) => void;
  fetchFromSupabase: () => Promise<void>;
  createTicket: (ticket: Ticket) => Promise<{ error: string | null }>;
  addMessage: (ticketId: string, message: TicketMessage) => Promise<void>;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => Promise<void>;
  /** Pass `dueDate: null` to clear. */
  updateTicket: (
    ticketId: string,
    patch: { dueDate?: string | null; title?: string; priority?: Ticket['priority'] }
  ) => Promise<void>;
  deleteTicket: (ticketId: string) => Promise<void>;
  getTicketsByEstate: (estateId: string) => Ticket[];
  getTicketsByGuest: (guestId: string) => Ticket[];
  getOpenTicketsCount: (estateIds: string[]) => number;
}

export const useTicketStore = create<TicketState>()(
  persist(
    (set, get) => ({
      tickets: [],
      setTickets: (tickets) => set({ tickets }),
      fetchFromSupabase: async () => {
        const { data, error } = await supabase.from('tickets').select('*');
        if (error) {
          console.warn('ticket-store fetchFromSupabase:', error.message);
          return;
        }
        if (!data) return;
        const remote = dedupeById(data).map(fromDb);
        const local = get().tickets;
        const remoteIds = new Set(remote.map((t) => t.id));
        const localOnly = local.filter((t) => !remoteIds.has(t.id));
        set({ tickets: [...remote, ...localOnly] });
      },
      createTicket: async (ticket) => {
        set((s) => ({ tickets: [...s.tickets, ticket] }));
        const { error } = await supabase.from('tickets').insert(toDb(ticket));
        if (error) {
          console.warn('createTicket: Supabase insert failed (ticket kept locally)', error.message);
          return { error: error.message };
        }
        return { error: null };
      },
      addMessage: async (ticketId, message) => {
        set((s) => ({
          tickets: s.tickets.map((t) =>
            t.id === ticketId
              ? { ...t, messages: [...t.messages, message], updatedAt: new Date().toISOString() }
              : t
          ),
        }));
        const ticket = get().tickets.find((t) => t.id === ticketId);
        if (ticket) {
          await supabase
            .from('tickets')
            .update({
              messages: ticket.messages,
              updated_at: ticket.updatedAt,
              due_date: ticket.dueDate ?? null,
            })
            .eq('id', ticketId);
        }
      },
      updateTicket: async (ticketId, patch) => {
        const updatedAt = new Date().toISOString();
        set((s) => ({
          tickets: s.tickets.map((t) => {
            if (t.id !== ticketId) return t;
            const next = { ...t, updatedAt };
            if ('dueDate' in patch) {
              next.dueDate =
                patch.dueDate === null || patch.dueDate === undefined || patch.dueDate === ''
                  ? undefined
                  : patch.dueDate;
            }
            if (patch.title !== undefined) next.title = patch.title.trim() || t.title;
            if (patch.priority !== undefined) next.priority = patch.priority;
            return next;
          }),
        }));
        const dbPatch: Record<string, unknown> = { updated_at: updatedAt };
        if ('dueDate' in patch) {
          dbPatch.due_date =
            patch.dueDate === null || patch.dueDate === undefined || patch.dueDate === ''
              ? null
              : patch.dueDate;
        }
        if (patch.title !== undefined) {
          const t = get().tickets.find((x) => x.id === ticketId);
          if (t) dbPatch.title = t.title;
        }
        if (patch.priority !== undefined) dbPatch.priority = patch.priority;
        await supabase.from('tickets').update(dbPatch).eq('id', ticketId);
      },
      deleteTicket: async (ticketId) => {
        set((s) => ({ tickets: s.tickets.filter((t) => t.id !== ticketId) }));
        const { error } = await supabase.from('tickets').delete().eq('id', ticketId);
        if (error) console.warn('deleteTicket:', error.message);
      },
      updateTicketStatus: async (ticketId, status) => {
        const updatedAt = new Date().toISOString();
        set((s) => ({
          tickets: s.tickets.map((t) =>
            t.id === ticketId ? { ...t, status, updatedAt } : t
          ),
        }));
        await supabase.from('tickets').update({ status, updated_at: updatedAt }).eq('id', ticketId);
      },
      getTicketsByEstate: (estateId) =>
        get().tickets.filter((t) => t.estateId === estateId),
      getTicketsByGuest: (guestId) =>
        get().tickets.filter((t) => t.guestId === guestId),
      getOpenTicketsCount: (estateIds) =>
        get().tickets.filter(
          (t) => estateIds.includes(t.estateId) && (t.status === 'open' || t.status === 'in_progress')
        ).length,
    }),
    {
      name: '@estateaid/tickets',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
