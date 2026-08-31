import AsyncStorage from '@react-native-async-storage/async-storage';

import { addDays, today } from '@/lib/date-utils';
import { getEventOccurrences } from '@/lib/event-utils';
import { isIssueTask } from '@/lib/issue-task';
import { sendCategorizedPush } from '@/lib/notifications';
import { useEstateStore } from '@/store/estate-store';
import { useEventStore } from '@/store/event-store';

const KEY = 'maison.event_reminder_sent';

/** Fire maintenance reminder pushes once per occurrence at the event's lead time. */
export async function maybeSendEventReminders(): Promise<void> {
  const todayStr = today();
  const events = useEventStore.getState().events.filter((e) => !isIssueTask(e));
  if (events.length === 0) return;

  let sent: string[] = [];
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) sent = JSON.parse(raw) as string[];
  } catch {
    sent = [];
  }

  for (const event of events) {
    const lead = event.reminderLeadDays ?? 7;
    const horizon = addDays(todayStr, Math.max(lead, 0));
    const occ = getEventOccurrences(event, todayStr, horizon);
    for (const fireDate of occ) {
      const remindOn = addDays(fireDate, -lead);
      if (remindOn !== todayStr) continue;
      const stamp = `${event.id}:${fireDate}`;
      if (sent.includes(stamp)) continue;
      const estate = useEstateStore.getState().getEstateById(event.estateId);
      const body = estate
        ? `${event.title} at ${estate.name} is due ${fireDate === todayStr ? 'today' : fireDate}`
        : `${event.title} is coming up`;
      const data = { type: 'maintenance', estateId: event.estateId, eventId: event.id };
      const recipients = new Set<string>();
      if (estate?.ownerId) recipients.add(estate.ownerId);
      if (estate?.sponsorUserId) recipients.add(estate.sponsorUserId);
      for (const uid of recipients) {
        void sendCategorizedPush('maintenance', uid, 'Maintenance reminder', body, data);
      }
      sent.push(stamp);
    }
  }

  await AsyncStorage.setItem(KEY, JSON.stringify(sent.slice(-400)));
}
