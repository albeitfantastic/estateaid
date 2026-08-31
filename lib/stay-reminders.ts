import { addDays, today } from '@/lib/date-utils';
import { hostUserIdsForEstate } from '@/lib/estate-host-ids';
import { sendCategorizedPush, sendCategorizedPushToMany } from '@/lib/notifications';
import { useEstateStore } from '@/store/estate-store';
import { useStayStore } from '@/store/stay-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';

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
    const body = estate
      ? i18n.t('pushCopy.stayTomorrowBody', { name: estate.name })
      : i18n.t('pushCopy.stayTomorrowBodyGeneric');
    const data = { type: 'stay_reminder', estateId: stay.estateId };
    void sendCategorizedPush('stay_reminders', stay.guestId, i18n.t('pushCopy.stayTomorrowTitle'), body, data);
    void sendCategorizedPushToMany(
      'stay_reminders',
      hostUserIdsForEstate(stay.estateId).filter((id) => id !== stay.guestId),
      i18n.t('pushCopy.stayTomorrowTitle'),
      body,
      data
    );
    sent.push(stay.id);
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(sent.slice(-200)));
}
