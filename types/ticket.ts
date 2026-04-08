export type TicketStatus = 'open' | 'in_progress' | 'resolved';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface TicketMessage {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  attachmentUris?: string[];
  createdAt: string;
  /** Linked row from this property’s contacts list */
  taggedContactId?: string;
}

export interface Ticket {
  id: string;
  estateId: string;
  guestId: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  /** ISO date `YYYY-MM-DD` — shown on calendar when set */
  dueDate?: string;
  assigneeId?: string;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}
