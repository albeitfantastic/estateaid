import { addDays, datesOverlap, nightCount, parseDateStr } from '@/lib/date-utils';
import { stayIsSelf } from '@/lib/stay-occupant';
import type { EstateExpense } from '@/store/expense-store';
import type { Stay } from '@/types';

export type WeekOccupancy = {
  inHouse: number;
  arriving: number;
  departing: number;
};

/** Fri–Sun of the current weekend if today is Fri–Sun, otherwise the next Fri–Sun. */
export function briefingWeekendRange(todayStr: string): { from: string; to: string } {
  const weekday = parseDateStr(todayStr).getDay();
  if (weekday === 5) return { from: todayStr, to: addDays(todayStr, 2) };
  if (weekday === 6) return { from: todayStr, to: addDays(todayStr, 1) };
  if (weekday === 0) return { from: todayStr, to: todayStr };
  const daysUntilFri = 5 - weekday;
  const fri = addDays(todayStr, daysUntilFri);
  return { from: fri, to: addDays(fri, 2) };
}

export function weekOccupancy(stays: Stay[], estateIds: string[], todayStr: string): WeekOccupancy {
  const scope = new Set(estateIds);
  const horizon = addDays(todayStr, 7);
  let inHouse = 0;
  let arriving = 0;
  let departing = 0;
  for (const s of stays) {
    if (!scope.has(s.estateId) || !s.from || !s.to) continue;
    if (s.from <= todayStr && todayStr <= s.to) inHouse += 1;
    if (s.from > todayStr && s.from <= horizon) arriving += 1;
    if (s.to >= todayStr && s.to <= horizon) departing += 1;
  }
  return { inHouse, arriving, departing };
}

export function emptyEstateNamesThisWeekend(
  estateIds: string[],
  namesById: Record<string, string>,
  stays: Stay[],
  todayStr: string
): string[] {
  if (estateIds.length === 0) return [];
  const { from, to } = briefingWeekendRange(todayStr);
  const scope = new Set(estateIds);
  const occupied = new Set<string>();
  for (const s of stays) {
    if (!scope.has(s.estateId) || !s.from || !s.to) continue;
    if (datesOverlap(s.from, s.to, from, to)) occupied.add(s.estateId);
  }
  return estateIds.filter((id) => !occupied.has(id)).map((id) => namesById[id] ?? id);
}

function nightsClippedToYear(stay: Stay, year: number): number {
  if (!stay.from || !stay.to) return 0;
  const yearStart = `${year}-01-01`;
  const yearEndExclusive = `${year + 1}-01-01`;
  if (!datesOverlap(stay.from, stay.to, yearStart, addDays(yearEndExclusive, -1))) return 0;
  const clipFrom = stay.from > yearStart ? stay.from : yearStart;
  const clipTo = stay.to < yearEndExclusive ? stay.to : yearEndExclusive;
  return Math.max(0, nightCount(clipFrom, clipTo));
}

export type YearPropertyNights = { estateId: string; nights: number };

export function busiestPropertyNights(
  stays: Stay[],
  estateIds: string[],
  year: number
): YearPropertyNights | null {
  const scope = new Set(estateIds);
  const byEstate = new Map<string, number>();
  for (const s of stays) {
    if (!scope.has(s.estateId)) continue;
    const n = nightsClippedToYear(s, year);
    if (n <= 0) continue;
    byEstate.set(s.estateId, (byEstate.get(s.estateId) ?? 0) + n);
  }
  let best: YearPropertyNights | null = null;
  for (const [estateId, nights] of byEstate) {
    if (!best || nights > best.nights) best = { estateId, nights };
  }
  return best;
}

export type YearGuestNights = {
  nights: number;
  guestId?: string;
  guestProfileId?: string;
};

function occupantKey(stay: Stay): string | null {
  if (stay.guestProfileId) return `p:${stay.guestProfileId}`;
  if (stay.guestId) return `u:${stay.guestId}`;
  return null;
}

export function heaviestGuestNights(
  stays: Stay[],
  estateIds: string[],
  year: number,
  currentUserId?: string | null
): YearGuestNights | null {
  const scope = new Set(estateIds);
  const byKey = new Map<string, YearGuestNights>();
  for (const s of stays) {
    if (!scope.has(s.estateId) || stayIsSelf(s, currentUserId)) continue;
    const key = occupantKey(s);
    if (!key) continue;
    const n = nightsClippedToYear(s, year);
    if (n <= 0) continue;
    const prev = byKey.get(key);
    if (prev) {
      prev.nights += n;
    } else {
      byKey.set(key, {
        nights: n,
        guestId: s.guestId,
        guestProfileId: s.guestProfileId,
      });
    }
  }
  let best: YearGuestNights | null = null;
  for (const row of byKey.values()) {
    if (!best || row.nights > best.nights) best = row;
  }
  return best;
}

export function yearSpendTotal(
  expenses: EstateExpense[],
  estateIds: string[],
  year: number
): number {
  const scope = new Set(estateIds);
  const prefix = `${year}-`;
  let sum = 0;
  for (const e of expenses) {
    if (!scope.has(e.estateId) || !e.date.startsWith(prefix)) continue;
    sum += e.amount;
  }
  return Math.round(sum * 100) / 100;
}
