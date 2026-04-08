import type { DayInfo } from '@/components/calendar/month-grid';
import { eachDateInMonth, today } from '@/lib/date-utils';

/**
 * After stays/events are merged, fills every in-month day that is not blocked or
 * my-stay: past dates → `unavailable`, today and future → `available`.
 */
export function finalizeCalendarAvailability(
  map: Record<string, DayInfo>,
  viewYear: number,
  viewMonth0: number
): void {
  const todayStr = today();
  for (const dateStr of eachDateInMonth(viewYear, viewMonth0)) {
    const cur = map[dateStr];
    if (cur?.availability === 'blocked' || cur?.availability === 'my-stay') continue;
    if (dateStr < todayStr) {
      map[dateStr] = { ...cur, dateStr, availability: 'unavailable' };
    } else {
      map[dateStr] = { ...cur, dateStr, availability: 'available' };
    }
  }
}
