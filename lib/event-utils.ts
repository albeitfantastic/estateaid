import { EstateEvent, RecurrenceFrequency } from '@/types';
import { toISODate, parseDateStr, addMonths } from './date-utils';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const RECURRENCE_FREQUENCIES: RecurrenceFrequency[] = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'semi_annual',
  'yearly',
  'custom',
];

const FREQ_LABELS: Record<RecurrenceFrequency, string> = {
  daily: 'Every day',
  weekly: 'Every week',
  biweekly: 'Every 2 weeks',
  monthly: 'Every month',
  quarterly: 'Every 3 months',
  semi_annual: 'Every 6 months',
  yearly: 'Every year',
  custom: 'Custom',
};

export function usesDayOfMonth(freq: RecurrenceFrequency): boolean {
  return (
    freq === 'monthly' ||
    freq === 'quarterly' ||
    freq === 'semi_annual' ||
    freq === 'yearly' ||
    freq === 'custom'
  );
}

export function monthStepFor(freq: RecurrenceFrequency, intervalMonths?: number): number | null {
  switch (freq) {
    case 'monthly':
      return 1;
    case 'quarterly':
      return 3;
    case 'semi_annual':
      return 6;
    case 'yearly':
      return 12;
    case 'custom':
      return intervalMonths && intervalMonths > 0 ? intervalMonths : null;
    default:
      return null;
  }
}

export function describeRecurrence(event: EstateEvent): string {
  if (event.type === 'task') return event.date ?? 'One-time task';
  const r = event.recurrence;
  if (!r) return '';
  const freq = FREQ_LABELS[r.frequency] ?? r.frequency;
  if ((r.frequency === 'weekly' || r.frequency === 'biweekly') && r.dayOfWeek != null) {
    return `${freq} on ${DAY_NAMES[r.dayOfWeek]}`;
  }
  if (usesDayOfMonth(r.frequency) && r.dayOfMonth != null) {
    return `${freq} on the ${ordinal(r.dayOfMonth)}`;
  }
  if (r.frequency === 'custom' && r.intervalDays) {
    return `Every ${r.intervalDays} day${r.intervalDays === 1 ? '' : 's'}`;
  }
  if (r.frequency === 'custom' && r.intervalMonths) {
    return `Every ${r.intervalMonths} month${r.intervalMonths === 1 ? '' : 's'}`;
  }
  return freq;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Get all occurrences of an event within a date range [from, to] (YYYY-MM-DD).
 * Returns an array of YYYY-MM-DD strings.
 */
export function getEventOccurrences(event: EstateEvent, from: string, to: string): string[] {
  if (event.type === 'task') {
    if (event.date && event.date >= from && event.date <= to) return [event.date];
    return [];
  }

  const r = event.recurrence;
  if (!r) return [];

  const rangeStart = r.startDate > from ? r.startDate : from;
  const rangeEnd = r.endDate && r.endDate < to ? r.endDate : to;
  if (rangeStart > rangeEnd) return [];

  const dates: string[] = [];
  const cur = parseDateStr(rangeStart);
  const end = parseDateStr(rangeEnd);

  if (r.frequency === 'daily') {
    while (cur <= end) {
      dates.push(toISODate(cur));
      cur.setDate(cur.getDate() + 1);
    }
  } else if (r.frequency === 'weekly' && r.dayOfWeek != null) {
    while (cur.getDay() !== r.dayOfWeek) cur.setDate(cur.getDate() + 1);
    while (cur <= end) {
      dates.push(toISODate(cur));
      cur.setDate(cur.getDate() + 7);
    }
  } else if (r.frequency === 'biweekly' && r.dayOfWeek != null) {
    const anchor = parseDateStr(r.startDate);
    while (anchor.getDay() !== r.dayOfWeek) anchor.setDate(anchor.getDate() + 1);
    while (anchor < cur) anchor.setDate(anchor.getDate() + 14);
    while (anchor <= end) {
      if (toISODate(anchor) >= rangeStart) dates.push(toISODate(anchor));
      anchor.setDate(anchor.getDate() + 14);
    }
  } else if (r.frequency === 'custom' && r.intervalDays && r.intervalDays > 0) {
    const step = r.intervalDays;
    const anchor = parseDateStr(r.startDate);
    while (anchor < cur) anchor.setDate(anchor.getDate() + step);
    while (anchor <= end) {
      const ds = toISODate(anchor);
      if (ds >= rangeStart) dates.push(ds);
      anchor.setDate(anchor.getDate() + step);
    }
  } else {
    const step = monthStepFor(r.frequency, r.intervalMonths);
    if (step) {
      const day = r.dayOfMonth ?? parseDateStr(r.startDate).getDate();
      let cursor = r.startDate;
      while (cursor < rangeStart) {
        cursor = addMonths(cursor, step);
      }
      while (cursor <= rangeEnd) {
        const ymd = cursor.split('-');
        const y = Number(ymd[0]);
        const m = Number(ymd[1]) - 1;
        const dim = new Date(y, m + 1, 0).getDate();
        const d = new Date(y, m, Math.min(day, dim));
        const ds = toISODate(d);
        if (ds >= rangeStart && ds <= rangeEnd) dates.push(ds);
        cursor = addMonths(cursor, step);
      }
    }
  }

  return dates;
}
