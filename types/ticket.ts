export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface TicketMessage {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  attachmentUris?: string[];
  createdAt: string;
}

export interface Ticket {
  id: string;
  estateId: string;
  guestId: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}
