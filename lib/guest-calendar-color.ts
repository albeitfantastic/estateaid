import { EstateColors } from '@/constants/theme';
import type { Invitation } from '@/types';

export const GUEST_CALENDAR_PALETTE: readonly string[] = EstateColors;

function hashGuestId(guestId: string): number {
  let h = 0;
  for (let i = 0; i < guestId.length; i++) {
    h = (Math.imul(31, h) + guestId.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Assigned color, or a stable palette fallback so guests stay distinct before a sponsor picks one. */
export function resolveGuestCalendarColor(
  guestId: string | undefined,
  invitations: Invitation[],
  estateId?: string
): string {
  if (!guestId) return GUEST_CALENDAR_PALETTE[0];
  const assigned = invitations.find(
    (inv) =>
      inv.guestId === guestId &&
      inv.status === 'accepted' &&
      (!estateId || inv.estateId === estateId) &&
      !!inv.calendarColor
  )?.calendarColor;
  if (assigned) return assigned;
  return GUEST_CALENDAR_PALETTE[hashGuestId(guestId) % GUEST_CALENDAR_PALETTE.length];
}
