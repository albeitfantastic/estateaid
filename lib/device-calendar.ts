import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import type * as CalendarNS from 'expo-calendar';

export type CalendarKind = 'apple' | 'google';

export type DeviceCalendar = {
  id: string;
  title: string;
  kind: CalendarKind;
  isPrimary: boolean;
};

type CalendarModule = typeof CalendarNS;

let calendarMod: CalendarModule | null | undefined;

function getCalendar(): CalendarModule | null {
  if (calendarMod !== undefined) return calendarMod;
  if (!requireOptionalNativeModule('ExpoCalendar')) {
    calendarMod = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    calendarMod = require('expo-calendar') as CalendarModule;
  } catch {
    calendarMod = null;
  }
  return calendarMod;
}

export function isDeviceCalendarSupported(): boolean {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  return getCalendar() != null;
}

export async function requestCalendarAccess(): Promise<boolean> {
  const Calendar = getCalendar();
  if (!Calendar || !isDeviceCalendarSupported()) return false;
  const current = await Calendar.getCalendarPermissionsAsync();
  if (current.granted) return true;
  const next = await Calendar.requestCalendarPermissionsAsync();
  return next.granted;
}

function sourceBlob(cal: CalendarNS.Calendar): string {
  const type = String(cal.source?.type ?? '');
  return [
    cal.title,
    cal.name,
    cal.ownerAccount,
    cal.source?.name,
    type,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function classifyCalendar(cal: CalendarNS.Calendar): CalendarKind | null {
  const Calendar = getCalendar();
  const blob = sourceBlob(cal);
  const type = String(cal.source?.type ?? '').toLowerCase();

  if (
    blob.includes('google') ||
    blob.includes('gmail') ||
    blob.includes('com.google')
  ) {
    return 'google';
  }

  if (Platform.OS === 'android') {
    return cal.isPrimary ? 'google' : null;
  }

  if (
    Calendar &&
    (type === Calendar.SourceType.LOCAL ||
      type === Calendar.SourceType.MOBILEME ||
      blob.includes('icloud') ||
      blob.includes('iphone') ||
      type === Calendar.SourceType.CALDAV)
  ) {
    return 'apple';
  }

  return null;
}

export async function listWritableCalendars(): Promise<DeviceCalendar[]> {
  const Calendar = getCalendar();
  if (!Calendar || !isDeviceCalendarSupported()) return [];
  const granted = await requestCalendarAccess();
  if (!granted) return [];

  const raw = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const out: DeviceCalendar[] = [];
  for (const cal of raw) {
    if (!cal.allowsModifications) continue;
    const kind = classifyCalendar(cal);
    if (!kind) continue;
    out.push({
      id: cal.id,
      title: cal.title,
      kind,
      isPrimary: !!cal.isPrimary,
    });
  }
  return out;
}

export async function pickCalendarForKind(kind: CalendarKind): Promise<DeviceCalendar | null> {
  const Calendar = getCalendar();
  const list = await listWritableCalendars();
  const matches = list.filter((c) => c.kind === kind);
  if (matches.length === 0) return null;

  if (Platform.OS === 'ios' && Calendar) {
    try {
      const def = await Calendar.getDefaultCalendarAsync();
      const hit = matches.find((c) => c.id === def.id);
      if (hit) return hit;
    } catch {
      /* no default */
    }
  }

  const primary = matches.find((c) => c.isPrimary);
  if (primary) return primary;

  const emailTitled = matches.find((c) => c.title.includes('@'));
  const titleHit = matches.find((c) => /calendar|icloud|google/i.test(c.title));
  return emailTitled ?? titleHit ?? matches[0] ?? null;
}

export type NativeEventDraft = {
  title: string;
  notes: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  recurrenceRule?: CalendarNS.RecurrenceRule | null;
};

export async function upsertNativeEvent(
  calendarId: string,
  existingEventId: string | undefined,
  draft: NativeEventDraft
): Promise<string | null> {
  const Calendar = getCalendar();
  if (!Calendar || !isDeviceCalendarSupported()) return null;
  const payload: Omit<Partial<CalendarNS.Event>, 'id' | 'organizer'> = {
    title: draft.title,
    notes: draft.notes,
    location: draft.location ?? '',
    startDate: draft.startDate,
    endDate: draft.endDate,
    allDay: true,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    recurrenceRule: draft.recurrenceRule ?? null,
  };

  if (existingEventId) {
    try {
      await Calendar.updateEventAsync(existingEventId, payload, { futureEvents: true });
      return existingEventId;
    } catch {
      /* recreate */
    }
  }

  try {
    return await Calendar.createEventAsync(calendarId, payload);
  } catch {
    return null;
  }
}

export async function deleteNativeEvent(eventId: string): Promise<void> {
  const Calendar = getCalendar();
  if (!Calendar || !isDeviceCalendarSupported()) return;
  try {
    await Calendar.deleteEventAsync(eventId, { futureEvents: true });
  } catch {
    /* already gone */
  }
}
