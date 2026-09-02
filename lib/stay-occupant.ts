import { resolveGuestCalendarColor } from '@/lib/guest-calendar-color';
import { resolveUserDisplayName, type ProfileRow } from '@/store/profile-store';
import type { GuestProfile, Invitation, Stay } from '@/types';

export function stayIsSelf(stay: Stay, userId?: string | null): boolean {
  return !!userId && !!stay.guestId && stay.guestId === userId;
}

/** True when the user occupies a stay on that property on `date` (inclusive from–to). */
export function userHasStayOnEstateOnDate(
  stays: Stay[],
  userId: string | undefined | null,
  estateId: string,
  date: string
): boolean {
  if (!userId || !estateId || !date) return false;
  return stays.some(
    (s) => s.estateId === estateId && s.guestId === userId && s.from <= date && date <= s.to
  );
}

export function resolveStayOccupantName(
  stay: Stay,
  opts: {
    profilesById: Record<string, ProfileRow>;
    guestProfiles: GuestProfile[];
  }
): string {
  if (stay.guestProfileId) {
    return opts.guestProfiles.find((p) => p.id === stay.guestProfileId)?.name?.trim() || 'Guest';
  }
  return resolveUserDisplayName(stay.guestId, opts.profilesById);
}

export function resolveStayOccupantColor(
  stay: Stay,
  invitations: Invitation[],
  guestProfiles: GuestProfile[]
): string {
  if (stay.guestProfileId) {
    const p = guestProfiles.find((x) => x.id === stay.guestProfileId);
    if (p?.calendarColor) return p.calendarColor;
    return resolveGuestCalendarColor(stay.guestProfileId, []);
  }
  return resolveGuestCalendarColor(stay.guestId, invitations, stay.estateId);
}
