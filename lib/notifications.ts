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

const DEFAULT_PREFS: Record<NotificationCategory, boolean> = {
  stay_requests: true,
  stay_decisions: true,
  stay_reminders: true,
  maintenance: true,
  invites: true,
};

export async function getNotificationCategoryPrefs(): Promise<Record<NotificationCategory, boolean>> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function setNotificationCategoryPref(
  category: NotificationCategory,
  enabled: boolean
): Promise<void> {
  const prefs = await getNotificationCategoryPrefs();
  prefs[category] = enabled;
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

/** Request permission after first estate or first redeem — never on cold start / onboarding. */
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

/** Category-aware push; respects Settings toggles on the sender device (prefs are local). */
export async function sendCategorizedPush(
  category: NotificationCategory,
  token: string | null,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const prefs = await getNotificationCategoryPrefs();
  if (!prefs[category]) return;
  await sendPush(token, title, body, { ...data, category });
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
        : '/(app)/stays';
    case 'stay_decision':
      return '/(app)/stays?tab=requests';
    case 'stay_reminder':
      return estateId ? `/(app)/estates/${estateId}` : '/(app)/stays';
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
