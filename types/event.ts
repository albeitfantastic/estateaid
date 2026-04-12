export type EventType = 'task' | 'recurring';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

/** One-time maintenance vs guest/owner issue thread (former tickets). */
export type TaskKind = 'calendar' | 'issue';

export type IssueStatus = 'open' | 'in_progress' | 'resolved';
export type IssuePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface EstateEventMessage {
  id: string;
  eventId: string;
  authorId: string;
  body: string;
  attachmentUris?: string[];
  createdAt: string;
  /** Linked row from this property's contacts list */
  taggedContactId?: string;
}

export interface EstateEvent {
  id: string;
  estateId: string;
  title: string;
  description?: string;
  type: EventType;
  /** Only for `type === 'task'`. `null`/`undefined` for recurring. */
  taskKind?: TaskKind | null;
  /** For one-time tasks */
  date?: string; // YYYY-MM-DD
  /** For recurring events */
  recurrence?: {
    frequency: RecurrenceFrequency;
    dayOfWeek?: number; // 0=Sun..6=Sat (for weekly/biweekly)
    dayOfMonth?: number; // 1-31 (for monthly)
    startDate: string;
    endDate?: string;
  };
  color?: string;
  createdAt: string;
  /** Issue tasks (`taskKind === 'issue'`) */
  guestId?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  assigneeId?: string;
  messages?: EstateEventMessage[];
  updatedAt?: string;
}
