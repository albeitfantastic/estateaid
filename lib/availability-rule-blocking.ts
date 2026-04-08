import type { EstateAvailabilityRule } from '@/types/availability-rule';
import { addDays, datesOverlap, parseDateStr, today } from '@/lib/date-utils';

const DEFAULT_PAST_DAYS = 400;
const DEFAULT_FUTURE_DAYS = 800;

export function rulesForEstate(rules: EstateAvailabilityRule[], estateId: string): EstateAvailabilityRule[] {
  return rules.filter((r) => r.estateId === estateId && r.enabled);
}

function clipRange(
  from: string,
  to: string,
  windowStart: string,
  windowEnd: string
): { from: string; to: string } | null {
  const cf = from > windowStart ? from : windowStart;
  const ct = to < windowEnd ? to : windowEnd;
  if (cf <= ct) return { from: cf, to: ct };
  return null;
}

/**
 * Expand MM-DD … MM-DD closures into concrete YYYY-MM-DD ranges overlapping [windowStart, windowEnd].
 * When start > end (e.g. Nov–Mar), the closure spans the new year.
 */
export function expandAnnualClosureRanges(
  annualFrom: string,
  annualTo: string,
  windowStart: string,
  windowEnd: string
): { from: string; to: string }[] {
  const y0 = parseDateStr(windowStart).getFullYear();
  const y1 = parseDateStr(windowEnd).getFullYear();
  const out: { from: string; to: string }[] = [];

  for (let y = y0 - 1; y <= y1 + 1; y++) {
    if (annualFrom <= annualTo) {
      const from = `${y}-${annualFrom}`;
      const to = `${y}-${annualTo}`;
      const clipped = clipRange(from, to, windowStart, windowEnd);
      if (clipped) out.push(clipped);
    } else {
      const a = clipRange(`${y}-${annualFrom}`, `${y}-12-31`, windowStart, windowEnd);
      if (a) out.push(a);
      const b = clipRange(`${y + 1}-01-01`, `${y + 1}-${annualTo}`, windowStart, windowEnd);
      if (b) out.push(b);
    }
  }
  return out;
}

/** Ranges that block picking dates (stays-like), within an optional window. */
export function calendarBlockingRangesFromRules(
  rules: EstateAvailabilityRule[],
  estateId: string,
  opts?: { windowStart?: string; windowEnd?: string }
): { from: string; to: string }[] {
  const rs = rulesForEstate(rules, estateId);
  const todayStr = today();
  const windowStart = opts?.windowStart ?? addDays(todayStr, -DEFAULT_PAST_DAYS);
  const windowEnd = opts?.windowEnd ?? addDays(todayStr, DEFAULT_FUTURE_DAYS);
  const out: { from: string; to: string }[] = [];

  for (const r of rs) {
    if (r.kind === 'blackout' && r.from && r.to) {
      const clipped = clipRange(r.from, r.to, windowStart, windowEnd);
      if (clipped) out.push(clipped);
    }
    if (r.kind === 'annual_closure' && r.annualFrom && r.annualTo) {
      out.push(...expandAnnualClosureRanges(r.annualFrom, r.annualTo, windowStart, windowEnd));
    }
  }
  return out;
}

export function rangeOverlapsRuleBlocking(
  rules: EstateAvailabilityRule[],
  estateId: string,
  from: string,
  to: string
): boolean {
  return calendarBlockingRangesFromRules(rules, estateId).some((b) => datesOverlap(from, to, b.from, b.to));
}

export function isDateBlockedByRules(
  rules: EstateAvailabilityRule[],
  estateId: string,
  dateStr: string
): boolean {
  return calendarBlockingRangesFromRules(rules, estateId).some((b) => dateStr >= b.from && dateStr <= b.to);
}

/** Strictest minimum nights across enabled rules (highest number wins). */
export function effectiveMinNights(rules: EstateAvailabilityRule[], estateId: string): number | undefined {
  const vals = rulesForEstate(rules, estateId)
    .filter((r) => r.kind === 'min_nights' && r.minNights != null && r.minNights > 0)
    .map((r) => r.minNights!);
  if (vals.length === 0) return undefined;
  return Math.max(...vals);
}

/** Strictest max advance: smallest limit wins. */
export function effectiveMaxAdvanceDays(rules: EstateAvailabilityRule[], estateId: string): number | undefined {
  const vals = rulesForEstate(rules, estateId)
    .filter((r) => r.kind === 'max_advance_days' && r.maxAdvanceDays != null && r.maxAdvanceDays > 0)
    .map((r) => r.maxAdvanceDays!);
  if (vals.length === 0) return undefined;
  return Math.min(...vals);
}

export function violatesMinNights(
  rules: EstateAvailabilityRule[],
  estateId: string,
  from: string,
  to: string,
  nightCount: number
): boolean {
  const min = effectiveMinNights(rules, estateId);
  if (min == null) return false;
  return nightCount < min;
}

export function violatesMaxAdvance(
  rules: EstateAvailabilityRule[],
  estateId: string,
  checkIn: string
): boolean {
  const maxDays = effectiveMaxAdvanceDays(rules, estateId);
  if (maxDays == null) return false;
  const limit = addDays(today(), maxDays);
  return checkIn > limit;
}
