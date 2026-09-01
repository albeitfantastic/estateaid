import { useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { OutlineButton } from '@/components/ui/screen-layout';
import {
  addEstateEventToCalendar,
  addStayToCalendar,
  canExportEstateEvent,
} from '@/lib/calendar-export';
import { isDeviceCalendarSupported } from '@/lib/device-calendar';
import type { EstateEvent, Stay } from '@/types';

type Props =
  | { stay: Stay; event?: undefined }
  | { event: EstateEvent; stay?: undefined };

export function AddToCalendarButton({ stay, event }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  if (event && !canExportEstateEvent(event)) return null;

  async function onPress() {
    if (!isDeviceCalendarSupported()) {
      Alert.alert(t('calendarSettings.title'), t('calendarSettings.webOnly'));
      return;
    }
    setBusy(true);
    try {
      const ok = stay
        ? await addStayToCalendar(stay)
        : event
          ? await addEstateEventToCalendar(event)
          : false;
      Alert.alert(
        t('calendarSettings.title'),
        ok ? t('calendarSettings.added') : t('calendarSettings.failed')
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <OutlineButton
      icon="calendar"
      label={busy ? t('common.loading') : t('calendarSettings.add')}
      onPress={() => void onPress()}
      disabled={busy}
    />
  );
}
