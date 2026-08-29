import { addDays, today } from '@/lib/date-utils';
import { getPushToken, sendCategorizedPush } from '@/lib/notifications';
import { useEstateStore } from '@/store/estate-store';
import { useStayStore } from '@/store/stay-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'maison.stay_reminder_sent';

/** Fire local “starts tomorrow” pushes once per stay (best-effort, on app open). */
export async function maybeSendStayTomorrowReminders(): Promise<void> {
  const tomorrow = addDays(today(), 1);
  const stays = useStayStore.getState().stays.filter((s) => s.from === tomorrow);
  if (stays.length === 0) return;

  let sent: string[] = [];
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) sent = JSON.parse(raw) as string[];
  } catch {
    sent = [];
  }

  for (const stay of stays) {
    if (sent.includes(stay.id)) continue;
    const estate = useEstateStore.getState().getEstateById(stay.estateId);
    const body = estate ? `${estate.name} starts tomorrow` : 'Your stay starts tomorrow';
    const data = { type: 'stay_reminder', estateId: stay.estateId };
    void getPushToken(stay.guestId).then((token) =>
      sendCategorizedPush('stay_reminders', token, 'Stay tomorrow', body, data)
    );
    if (estate?.ownerId) {
      void getPushToken(estate.ownerId).then((token) =>
        sendCategorizedPush('stay_reminders', token, 'Stay tomorrow', body, data)
      );
    }
    sent.push(stay.id);
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(sent.slice(-200)));
}
