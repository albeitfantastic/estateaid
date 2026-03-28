import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ticket, TicketMessage, TicketStatus } from '@/types';

interface TicketState {
  tickets: Ticket[];
  setTickets: (tickets: Ticket[]) => void;
  createTicket: (ticket: Ticket) => void;
  addMessage: (ticketId: string, message: TicketMessage) => void;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => void;
  getTicketsByEstate: (estateId: string) => Ticket[];
  getTicketsByGuest: (guestId: string) => Ticket[];
  getOpenTicketsCount: (estateIds: string[]) => number;
}

export const useTicketStore = create<TicketState>()(
  persist(
    (set, get) => ({
      tickets: [],
      setTickets: (tickets) => set({ tickets }),
      createTicket: (ticket) =>
        set((s) => ({ tickets: [...s.tickets, ticket] })),
      addMessage: (ticketId, message) =>
        set((s) => ({
          tickets: s.tickets.map((t) =>
            t.id === ticketId
              ? { ...t, messages: [...t.messages, message], updatedAt: new Date().toISOString() }
              : t
          ),
        })),
      updateTicketStatus: (ticketId, status) =>
        set((s) => ({
          tickets: s.tickets.map((t) =>
            t.id === ticketId
              ? { ...t, status, updatedAt: new Date().toISOString() }
              : t
          ),
        })),
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
