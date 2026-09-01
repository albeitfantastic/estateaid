import AsyncStorage from '@react-native-async-storage/async-storage';
import type * as Calendar from 'expo-calendar';
import i18n from 'i18next';

import { addDays, parseDateStr } from '@/lib/date-utils';
import { isIssueTask } from '@/lib/issue-task';
import {
  deleteNativeEvent,
  isDeviceCalendarSupported,
  listWritableCalendars,
  pickCalendarForKind,
  requestCalendarAccess,
  upsertNativeEvent,
  type CalendarKind,
  type DeviceCalendar,
  type NativeEventDraft,
} from '@/lib/device-calendar';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import type { EstateEvent, RecurrenceFrequency, Stay } from '@/types';

const PREFS_KEY = 'maison.calendar_export.prefs';
const MAP_KEY = 'maison.calendar_export.map';

export type CalendarExportPrefs = {
  enabled: boolean;
  appleEnabled: boolean;
  googleEnabled: boolean;
  appleCalendarId?: string;
  googleCalendarId?: string;
};

type ExportRef = { calendarId: string; eventId: string };
type ExportMap = Record<string, ExportRef[]>;

const DEFAULT_PREFS: CalendarExportPrefs = {
  enabled: false,
  appleEnabled: false,
  googleEnabled: false,
};

function prefsKey(userId: string) {
  return `${PREFS_KEY}.${userId}`;
}

function mapKey(userId: string) {
  return `${MAP_KEY}.${userId}`;
}

function currentUserId(): string | null {
  return useAuthStore.getState().currentUser?.id ?? null;
}

export async function getCalendarExportPrefs(userId?: string | null): Promise<CalendarExportPrefs> {
  const uid = userId ?? currentUserId();
  if (!uid) return { ...DEFAULT_PREFS };
  try {
    const raw = await AsyncStorage.getItem(prefsKey(uid));
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as CalendarExportPrefs) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function setCalendarExportPrefs(
  patch: Partial<CalendarExportPrefs>,
  userId?: string | null
): Promise<CalendarExportPrefs> {
  const uid = userId ?? currentUserId();
  const next = { ...(await getCalendarExportPrefs(uid)), ...patch };
  if (uid) {
    await AsyncStorage.setItem(prefsKey(uid), JSON.stringify(next));
  }
  return next;
}

async function readMap(userId: string): Promise<ExportMap> {
  try {
    const raw = await AsyncStorage.getItem(mapKey(userId));
    if (!raw) return {};
    return JSON.parse(raw) as ExportMap;
  } catch {
    return {};
  }
}

async function writeMap(userId: string, map: ExportMap): Promise<void> {
  await AsyncStorage.setItem(mapKey(userId), JSON.stringify(map));
}

function stayMapKey(id: string) {
  return `stay:${id}`;
}

function eventMapKey(id: string) {
  return `event:${id}`;
}

function localMidnight(dateStr: string): Date {
  return parseDateStr(dateStr);
}

function stayEndExclusive(to: string): Date {
  return parseDateStr(addDays(to, 1));
}

function taskEndExclusive(date: string): Date {
  return parseDateStr(addDays(date, 1));
}

function recurrenceToRule(
  event: EstateEvent
): Calendar.RecurrenceRule | null {
  const r = event.recurrence;
  if (event.type !== 'recurring' || !r) return null;

  const freq = r.frequency as RecurrenceFrequency;
  const endDate = r.endDate ? parseDateStr(addDays(r.endDate, 1)) : undefined;

  const weeklyDays =
    (freq === 'weekly' || freq === 'biweekly') && r.dayOfWeek != null
      ? [{ dayOfTheWeek: (r.dayOfWeek + 1) as Calendar.DayOfTheWeek }]
      : undefined;

  switch (freq) {
    case 'daily':
      return { frequency: 'daily' as Calendar.Frequency, interval: 1, endDate };
    case 'weekly':
      return {
        frequency: 'weekly' as Calendar.Frequency,
        interval: 1,
        endDate,
        daysOfTheWeek: weeklyDays,
      };
    case 'biweekly':
      return {
        frequency: 'weekly' as Calendar.Frequency,
        interval: 2,
        endDate,
        daysOfTheWeek: weeklyDays,
      };
    case 'monthly':
      return {
        frequency: 'monthly' as Calendar.Frequency,
        interval: 1,
        endDate,
        daysOfTheMonth: r.dayOfMonth ? [r.dayOfMonth] : undefined,
      };
    case 'quarterly':
      return {
        frequency: 'monthly' as Calendar.Frequency,
        interval: 3,
        endDate,
        daysOfTheMonth: r.dayOfMonth ? [r.dayOfMonth] : undefined,
      };
    case 'semi_annual':
      return {
        frequency: 'monthly' as Calendar.Frequency,
        interval: 6,
        endDate,
        daysOfTheMonth: r.dayOfMonth ? [r.dayOfMonth] : undefined,
      };
    case 'yearly':
      return { frequency: 'yearly' as Calendar.Frequency, interval: 1, endDate };
    case 'custom':
      if (r.intervalDays && r.intervalDays > 0) {
        return { frequency: 'daily' as Calendar.Frequency, interval: r.intervalDays, endDate };
      }
      if (r.intervalMonths && r.intervalMonths > 0) {
        return { frequency: 'monthly' as Calendar.Frequency, interval: r.intervalMonths, endDate };
      }
      return { frequency: 'monthly' as Calendar.Frequency, interval: 1, endDate };
    default:
      return null;
  }
}

export function canExportEstateEvent(event: EstateEvent): boolean {
  if (event.type === 'recurring' && event.recurrence?.startDate) return true;
  if (event.type === 'task' && event.date) return true;
  return false;
}

async function resolveTargets(
  prefs: CalendarExportPrefs,
  force: boolean
): Promise<DeviceCalendar[]> {
  if (!isDeviceCalendarSupported()) return [];
  if (!force && !prefs.enabled) return [];

  const available = await listWritableCalendars();
  const kinds: CalendarKind[] = [];
  if (prefs.appleEnabled) kinds.push('apple');
  if (prefs.googleEnabled) kinds.push('google');
  if (force && kinds.length === 0) {
    if (available.some((c) => c.kind === 'apple')) kinds.push('apple');
    if (available.some((c) => c.kind === 'google')) kinds.push('google');
  }

  const targets: DeviceCalendar[] = [];
  for (const kind of kinds) {
    const storedId = kind === 'apple' ? prefs.appleCalendarId : prefs.googleCalendarId;
    const stored = storedId ? available.find((c) => c.id === storedId && c.kind === kind) : null;
    const picked = stored ?? (await pickCalendarForKind(kind));
    if (picked) targets.push(picked);
  }
  return targets;
}

async function upsertDraft(
  entityKey: string,
  draft: NativeEventDraft,
  force: boolean
): Promise<boolean> {
  const uid = currentUserId();
  if (!uid) return false;
  const prefs = await getCalendarExportPrefs(uid);
  const targets = await resolveTargets(prefs, force);
  if (targets.length === 0) return false;

  const map = await readMap(uid);
  const prev = map[entityKey] ?? [];
  const next: ExportRef[] = [];

  for (const cal of targets) {
    const existing = prev.find((r) => r.calendarId === cal.id)?.eventId;
    const eventId = await upsertNativeEvent(cal.id, existing, draft);
    if (eventId) next.push({ calendarId: cal.id, eventId });
  }

  const dropped = prev.filter((r) => !next.some((n) => n.calendarId === r.calendarId));
  for (const ref of dropped) {
    void deleteNativeEvent(ref.eventId);
  }

  map[entityKey] = next;
  await writeMap(uid, map);
  return next.length > 0;
}

async function removeEntity(entityKey: string): Promise<void> {
  const uid = currentUserId();
  if (!uid) return;
  const map = await readMap(uid);
  const refs = map[entityKey] ?? [];
  for (const ref of refs) {
    void deleteNativeEvent(ref.eventId);
  }
  delete map[entityKey];
  await writeMap(uid, map);
}

function stayDraft(stay: Stay): NativeEventDraft | null {
  if (!stay.from || !stay.to) return null;
  const estate = useEstateStore.getState().getEstateById(stay.estateId);
  const guest = resolveUserDisplayName(stay.guestId, useProfileStore.getState().byId);
  const property = estate?.name ?? i18n.t('common.unknownEstate');
  return {
    title: i18n.t('calendarExport.stayTitle', { guest, property }),
    notes: i18n.t('calendarExport.stayNotes', { property }),
    location: estate?.location,
    startDate: localMidnight(stay.from),
    endDate: stayEndExclusive(stay.to),
  };
}

function eventDraft(event: EstateEvent): NativeEventDraft | null {
  if (!canExportEstateEvent(event)) return null;
  const estate = useEstateStore.getState().getEstateById(event.estateId);
  const property = estate?.name ?? i18n.t('common.unknownEstate');
  const startStr =
    event.type === 'recurring'
      ? event.recurrence?.startDate
      : event.date;
  if (!startStr) return null;
  return {
    title: event.title,
    notes: [event.description, i18n.t('calendarExport.eventNotes', { property })]
      .filter(Boolean)
      .join('\n\n'),
    location: estate?.location,
    startDate: localMidnight(startStr),
    endDate: taskEndExclusive(startStr),
    recurrenceRule: recurrenceToRule(event),
  };
}

/** Auto-export after a confirmed stay write. No-op if the user has not enabled export. */
export function exportStay(stay: Stay, force = false): void {
  void (async () => {
    const draft = stayDraft(stay);
    if (!draft) return;
    await upsertDraft(stayMapKey(stay.id), draft, force);
  })();
}

export function removeExportedStay(stayId: string): void {
  void removeEntity(stayMapKey(stayId));
}

export function exportEstateEvent(event: EstateEvent, force = false): void {
  void (async () => {
    if (isIssueTask(event) && !event.date) {
      await removeEntity(eventMapKey(event.id));
      return;
    }
    const draft = eventDraft(event);
    if (!draft) return;
    await upsertDraft(eventMapKey(event.id), draft, force);
  })();
}

export function removeExportedEvent(eventId: string): void {
  void removeEntity(eventMapKey(eventId));
}

export async function addStayToCalendar(stay: Stay): Promise<boolean> {
  const ok = await requestCalendarAccess();
  if (!ok) return false;
  const draft = stayDraft(stay);
  if (!draft) return false;
  return upsertDraft(stayMapKey(stay.id), draft, true);
}

export async function addEstateEventToCalendar(event: EstateEvent): Promise<boolean> {
  const ok = await requestCalendarAccess();
  if (!ok) return false;
  if (!canExportEstateEvent(event)) return false;
  const draft = eventDraft(event);
  if (!draft) return false;
  return upsertDraft(eventMapKey(event.id), draft, true);
}

export async function enableCalendarExport(
  userId: string
): Promise<{ ok: boolean; prefs: CalendarExportPrefs; missingGoogle: boolean; missingApple: boolean }> {
  const granted = await requestCalendarAccess();
  if (!granted) {
    const prefs = await setCalendarExportPrefs({ enabled: false }, userId);
    return { ok: false, prefs, missingGoogle: true, missingApple: true };
  }

  const available = await listWritableCalendars();
  const apple = available.find((c) => c.kind === 'apple') ?? (await pickCalendarForKind('apple'));
  const google = available.find((c) => c.kind === 'google') ?? (await pickCalendarForKind('google'));

  const prefs = await setCalendarExportPrefs(
    {
      enabled: true,
      appleEnabled: !!apple,
      googleEnabled: !!google,
      appleCalendarId: apple?.id,
      googleCalendarId: google?.id,
    },
    userId
  );

  return {
    ok: true,
    prefs,
    missingGoogle: !google,
    missingApple: !apple,
  };
}
