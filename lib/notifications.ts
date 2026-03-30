import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

// Show banners when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Request permission and save the Expo push token to the user's profile row. */
export async function registerPushToken(userId: string): Promise<void> {
  if (!Device.isDevice) return; // simulators don't support push
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
    // Token registration is best-effort — ignore failures (e.g. no projectId in dev)
  }
}

/** Remove push token from profile (e.g. user disabled notifications). */
export async function clearPushToken(userId: string): Promise<void> {
  try {
    await supabase.from('profiles').update({ push_token: null }).eq('id', userId);
  } catch {
    /* best-effort */
  }
}

/** Fetch another user's push token from Supabase. Returns null if unavailable. */
export async function getPushToken(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('id', userId)
    .maybeSingle();
  return (data?.push_token as string | null) ?? null;
}

/** Fire-and-forget push via Expo's notification service. Never throws. */
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
    // Notifications are best-effort — never block user flow on failure
  }
}
