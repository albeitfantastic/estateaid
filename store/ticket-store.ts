import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ticket, TicketMessage, TicketStatus } from '@/types';
import { supabase } from '@/lib/supabase';
import { dedupeById } from '@/lib/dedup-by-id';

function fromDb(row: Record<string, unknown>): Ticket {
  return {
    id: row.id as string,
    estateId: row.estate_id as string,
    guestId: row.guest_id as string,
    title: row.title as string,
    status: row.status as TicketStatus,
    priority: row.priority as Ticket['priority'],
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
  createTicket: (ticket: Ticket) => Promise<void>;
  addMessage: (ticketId: string, message: TicketMessage) => Promise<void>;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => Promise<void>;
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
        const { data } = await supabase.from('tickets').select('*');
        if (data) set({ tickets: dedupeById(data).map(fromDb) });
      },
      createTicket: async (ticket) => {
        set((s) => ({ tickets: [...s.tickets, ticket] }));
        const { error } = await supabase.from('tickets').insert(toDb(ticket));
        if (error) set((s) => ({ tickets: s.tickets.filter((t) => t.id !== ticket.id) }));
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
            .update({ messages: ticket.messages, updated_at: ticket.updatedAt })
            .eq('id', ticketId);
        }
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
