export type EventType = 'task' | 'recurring';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface EstateEvent {
  id: string;
  estateId: string;
  title: string;
  description?: string;
  type: EventType;
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
}
