/** Named guest who does not have the app. Hosts book stays against this row. */
export interface GuestProfile {
  id: string;
  /** Properties this person can be booked at. Always at least one. */
  estateIds: string[];
  createdBy: string;
  name: string;
  calendarColor?: string;
  createdAt: string;
}

/** Reads `estateIds`, with a fallback for persisted rows that still have `estateId`. */
export function guestProfileEstateIds(p: {
  estateIds?: string[];
  estateId?: string;
}): string[] {
  if (p.estateIds && p.estateIds.length > 0) return p.estateIds;
  if (p.estateId) return [p.estateId];
  return [];
}
