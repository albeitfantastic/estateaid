/** Convert a Date to "YYYY-MM-DD" string */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse "YYYY-MM-DD" to a Date (local midnight) */
export function parseDateStr(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Format a date range as "MMM D – MMM D, YYYY" or "MMM D–D, YYYY" */
export function formatDateRange(from: string, to: string): string {
  const f = parseDateStr(from);
  const t = parseDateStr(to);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const fStr = f.toLocaleDateString('en-US', opts);
  const tStr = t.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${fStr} – ${tStr}`;
}

/** Format a single date as "MMM D, YYYY" */
export function formatDate(dateStr: string): string {
  return parseDateStr(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Returns true if date range [a1,a2] overlaps [b1,b2].
 * All params are "YYYY-MM-DD" strings. Inclusive on both ends.
 */
export function datesOverlap(a1: string, a2: string, b1: string, b2: string): boolean {
  return a1 <= b2 && a2 >= b1;
}

/** Returns array of "YYYY-MM-DD" strings for every day in [from, to] inclusive */
export function getDaysInRange(from: string, to: string): string[] {
  const days: string[] = [];
  const cur = parseDateStr(from);
  const end = parseDateStr(to);
  while (cur <= end) {
    days.push(toISODate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

/** Returns today as "YYYY-MM-DD" */
export function today(): string {
  return toISODate(new Date());
}

/** Add (or subtract) N days from a "YYYY-MM-DD" string */
export function addDays(dateStr: string, n: number): string {
  const d = parseDateStr(dateStr);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Add N calendar months, clamping the day to the end of the target month. */
export function addMonths(dateStr: string, months: number): string {
  const src = parseDateStr(dateStr);
  const day = src.getDate();
  const d = new Date(src.getFullYear(), src.getMonth() + months, 1);
  const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, dim));
  return toISODate(d);
}

/** Number of nights between two date strings */
export function nightCount(from: string, to: string): number {
  const diff = parseDateStr(to).getTime() - parseDateStr(from).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

/** Every calendar date in a month as "YYYY-MM-DD" (month is 0-based, like Date). */
export function eachDateInMonth(year: number, monthIndex0: number): string[] {
  const last = new Date(year, monthIndex0 + 1, 0).getDate();
  const m = String(monthIndex0 + 1).padStart(2, '0');
  const out: string[] = [];
  for (let d = 1; d <= last; d++) {
    out.push(`${year}-${m}-${String(d).padStart(2, '0')}`);
  }
  return out;
}
