import type { GuestProfile, Invitation, Stay } from '@/types';
import { resolveGuestCalendarColor } from '@/lib/guest-calendar-color';
import { resolveUserDisplayName, type ProfileRow } from '@/store/profile-store';

export function stayIsSelf(stay: Stay, userId?: string | null): boolean {
  return !!userId && !!stay.guestId && stay.guestId === userId;
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
