import { EstateEvent } from '@/types';
import { toISODate, parseDateStr } from './date-utils';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FREQ_LABELS: Record<string, string> = {
  daily: 'Every day',
  weekly: 'Every week',
  biweekly: 'Every 2 weeks',
  monthly: 'Every month',
};

export function describeRecurrence(event: EstateEvent): string {
  if (event.type === 'task') return event.date ?? 'One-time task';
  const r = event.recurrence;
  if (!r) return '';
  const freq = FREQ_LABELS[r.frequency] ?? r.frequency;
  if ((r.frequency === 'weekly' || r.frequency === 'biweekly') && r.dayOfWeek != null) {
    return `${freq} on ${DAY_NAMES[r.dayOfWeek]}`;
  }
  if (r.frequency === 'monthly' && r.dayOfMonth != null) {
    return `${freq} on the ${ordinal(r.dayOfMonth)}`;
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
  } else if (r.frequency === 'monthly' && r.dayOfMonth != null) {
    let y = cur.getFullYear();
    let m = cur.getMonth();
    while (true) {
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const day = Math.min(r.dayOfMonth, daysInMonth);
      const d = new Date(y, m, day);
      const ds = toISODate(d);
      if (ds > rangeEnd) break;
      if (ds >= rangeStart) dates.push(ds);
      m++;
      if (m > 11) { m = 0; y++; }
    }
  }

  return dates;
}
