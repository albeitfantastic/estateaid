import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { router } from 'expo-router';

import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type NotificationCategory =
  | 'stay_requests'
  | 'stay_decisions'
  | 'stay_reminders'
  | 'maintenance'
  | 'invites';

const PREFS_KEY = 'maison.notification.categories';
const ASKED_KEY = 'maison.notification.asked';

export const DEFAULT_NOTIFICATION_PREFS: Record<NotificationCategory, boolean> = {
  stay_requests: true,
  stay_decisions: true,
  stay_reminders: true,
  maintenance: true,
  invites: true,
};

function mergePrefs(raw: unknown): Record<NotificationCategory, boolean> {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_NOTIFICATION_PREFS };
  return { ...DEFAULT_NOTIFICATION_PREFS, ...(raw as Record<string, boolean>) };
}

export async function getNotificationCategoryPrefs(
  userId?: string
): Promise<Record<NotificationCategory, boolean>> {
  if (userId) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('notification_prefs')
        .eq('id', userId)
        .maybeSingle();
      if (data?.notification_prefs != null) {
        const prefs = mergePrefs(data.notification_prefs);
        await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
        return prefs;
      }
    } catch {
      /* fall through to local cache */
    }
  }
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFS };
    return mergePrefs(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
}

export async function setNotificationCategoryPref(
  category: NotificationCategory,
  enabled: boolean,
  userId?: string
): Promise<void> {
  const prefs = await getNotificationCategoryPrefs(userId);
  prefs[category] = enabled;
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  const uid = userId ?? (await currentUserId());
  if (!uid) return;
  try {
    await supabase.from('profiles').update({ notification_prefs: prefs }).eq('id', uid);
  } catch {
    /* best-effort */
  }
}

async function currentUserId(): Promise<string | null> {
  try {
    const { useAuthStore } = await import('@/store/auth-store');
    return useAuthStore.getState().currentUser?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Master device toggle: persist locally, register or clear the Expo push token.
 * Used by both the settings hub and the dedicated notifications screen.
 */
export async function setPushMasterEnabled(userId: string, enabled: boolean): Promise<void> {
  const { useAuthStore } = await import('@/store/auth-store');
  useAuthStore.getState().setNotificationsEnabled(enabled);
  if (enabled) await registerPushToken(userId);
  else await clearPushToken(userId);
}

/**
 * Spec §13 notification mapping (category / deep-link `type`):
 * - New stay request → stay_requests / stay_request
 * - Request approved | declined | alternate → stay_decisions / stay_decision
 * - Stay starts tomorrow → stay_reminders / stay_reminder
 * - New ticket/issue → maintenance / maintenance
 * - Invite accepted → invites / invite_accepted
 *
 * Request permission after first meaningful action (first property created, or first
 * invite redeemed) — never on cold start / onboarding.
 */
export async function maybeRequestPushAfterMeaningfulAction(userId: string): Promise<void> {
  try {
    const asked = await AsyncStorage.getItem(ASKED_KEY);
    if (asked === '1') return;
    await AsyncStorage.setItem(ASKED_KEY, '1');
    await registerPushToken(userId);
    const { useAuthStore } = await import('@/store/auth-store');
    useAuthStore.getState().setNotificationsEnabled(true);
  } catch {
    /* best-effort */
  }
}

export async function registerPushToken(userId: string): Promise<void> {
  if (!Device.isDevice) return;
  const { status: existing } = await Notifications.getPermissionsAsync();
  const { status } =
    existing === 'granted'
      ? { status: existing }
      : await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
  } catch {
    /* best-effort */
  }
}

export async function clearPushToken(userId: string): Promise<void> {
  try {
    await supabase.from('profiles').update({ push_token: null }).eq('id', userId);
  } catch {
    /* best-effort */
  }
}

export async function getPushToken(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('id', userId)
    .maybeSingle();
  return (data?.push_token as string | null) ?? null;
}

export async function sendPush(
  token: string | null,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!token) return;
  try {
    await fetch('https://exp.host/--/expo-push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: token, title, body, data: data ?? {}, sound: 'default' }),
    });
  } catch {
    /* best-effort */
  }
}

/**
 * Category-aware push. Checks the **recipient's** server-side category prefs
 * (and their push token) so opt-out actually applies to the person receiving it.
 */
export async function sendCategorizedPush(
  category: NotificationCategory,
  recipientUserId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!recipientUserId) return;
  try {
    const { data: row } = await supabase
      .from('profiles')
      .select('push_token, notification_prefs')
      .eq('id', recipientUserId)
      .maybeSingle();
    const prefs = mergePrefs(row?.notification_prefs);
    if (!prefs[category]) return;
    const token = (row?.push_token as string | null) ?? null;
    await sendPush(token, title, body, { ...data, category });
  } catch {
    /* best-effort */
  }
}

/** Fan a category-aware push out to several recipients (sponsor + hosts, etc.). */
export async function sendCategorizedPushToMany(
  category: NotificationCategory,
  recipientUserIds: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const unique = [...new Set(recipientUserIds.filter(Boolean))];
  await Promise.all(unique.map((id) => sendCategorizedPush(category, id, title, body, data)));
}

export function pathForNotificationData(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  const type = typeof data.type === 'string' ? data.type : '';
  const estateId = typeof data.estateId === 'string' ? data.estateId : '';
  const requestId = typeof data.requestId === 'string' ? data.requestId : '';
  const eventId = typeof data.eventId === 'string' ? data.eventId : '';
  switch (type) {
    case 'stay_request':
      return estateId && requestId
        ? `/(app)/estates/${estateId}/stays/${requestId}`
        : '/(app)/calendar?segment=requests';
    case 'stay_decision':
      // Recipient is the guest. The Requests segment shows their own requests alongside
      // any they administer, so hosts who are guests elsewhere land correctly too.
      return '/(app)/calendar?segment=requests';
    case 'stay_reminder':
      return estateId ? `/(app)/estates/${estateId}` : '/(app)/calendar?segment=stays';
    case 'maintenance':
      return estateId && eventId
        ? `/(app)/estates/${estateId}/events/${eventId}`
        : estateId
          ? `/(app)/estates/${estateId}/events`
          : '/(app)/maintenance';
    case 'invite_accepted':
      return estateId ? `/(app)/estates/${estateId}/guests` : '/(app)/guests';
    default:
      return null;
  }
}

let responseSub: Notifications.Subscription | null = null;

export function setupNotificationDeepLinkListener(): () => void {
  if (responseSub) return () => {};
  responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown> | undefined;
    const path = pathForNotificationData(data);
    if (path) router.push(path as never);
  });
  return () => {
    responseSub?.remove();
    responseSub = null;
  };
}
