import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { OutlineButton, useScreenTheme } from '@/components/ui/screen-layout';
import { Radius } from '@/constants/theme';
import {
  addEstateEventToCalendar,
  addStayToCalendar,
  canExportEstateEvent,
} from '@/lib/calendar-export';
import {
  isDeviceCalendarSupported,
  listWritableCalendars,
  requestCalendarAccess,
  type DeviceCalendar,
} from '@/lib/device-calendar';
import type { EstateEvent, Stay } from '@/types';

type Props =
  | { stay: Stay; event?: undefined }
  | { event: EstateEvent; stay?: undefined };

function sortCalendars(list: DeviceCalendar[]): DeviceCalendar[] {
  return [...list].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    const aEmail = a.title.includes('@') ? 0 : 1;
    const bEmail = b.title.includes('@') ? 0 : 1;
    if (aEmail !== bEmail) return aEmail - bEmail;
    return a.title.localeCompare(b.title);
  });
}

export function AddToCalendarButton({ stay, event }: Props) {
  const { t } = useTranslation();
  const { colors } = useScreenTheme();
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [calendars, setCalendars] = useState<DeviceCalendar[]>([]);

  if (event && !canExportEstateEvent(event)) return null;

  const appleCals = sortCalendars(calendars.filter((c) => c.kind === 'apple'));
  const googleCals = sortCalendars(calendars.filter((c) => c.kind === 'google'));

  async function onPress() {
    if (!isDeviceCalendarSupported()) {
      Alert.alert(t('calendarSettings.title'), t('calendarSettings.webOnly'));
      return;
    }
    const granted = await requestCalendarAccess();
    if (!granted) {
      Alert.alert(t('calendarSettings.title'), t('calendarSettings.permissionDenied'));
      return;
    }
    const list = await listWritableCalendars();
    if (list.length === 0) {
      Alert.alert(t('calendarSettings.title'), t('calendarSettings.failed'));
      return;
    }
    setCalendars(list);
    setPickerOpen(true);
  }

  async function onPick(calendar: DeviceCalendar) {
    setPickerOpen(false);
    setBusy(true);
    try {
      const ok = stay
        ? await addStayToCalendar(stay, calendar)
        : event
          ? await addEstateEventToCalendar(event, calendar)
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
    <>
      <OutlineButton
        icon="calendar"
        label={busy ? t('common.loading') : t('calendarSettings.add')}
        onPress={() => void onPress()}
        disabled={busy}
      />
      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setPickerOpen(false)}>
          <View
            style={[styles.pickerSheet, { backgroundColor: colors.background, borderColor: colors.icon + '33' }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.pickerHeader, { borderBottomColor: colors.icon + '22' }]}>
              <ThemedText type="defaultSemiBold" style={{ fontSize: 17 }}>
                {t('calendarSettings.chooseTitle')}
              </ThemedText>
              <TouchableOpacity onPress={() => setPickerOpen(false)} hitSlop={12}>
                <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>{t('common.close')}</ThemedText>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerScroll} keyboardShouldPersistTaps="handled">
              {appleCals.length > 0 ? (
                <>
                  <ThemedText style={[styles.pickerSection, { color: colors.icon }]}>
                    {t('calendarSettings.apple')}
                  </ThemedText>
                  {appleCals.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.pickerRow, { borderBottomColor: colors.icon + '11' }]}
                      onPress={() => void onPick(c)}
                    >
                      <ThemedText type="defaultSemiBold" numberOfLines={1}>
                        {c.title}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </>
              ) : null}
              {googleCals.length > 0 ? (
                <>
                  <ThemedText style={[styles.pickerSection, { color: colors.icon }]}>
                    {t('calendarSettings.google')}
                  </ThemedText>
                  {googleCals.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.pickerRow, { borderBottomColor: colors.icon + '11' }]}
                      onPress={() => void onPick(c)}
                    >
                      <ThemedText type="defaultSemiBold" numberOfLines={1}>
                        {c.title}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </>
              ) : null}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    maxHeight: '72%',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingBottom: 24,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerScroll: { maxHeight: 400 },
  pickerSection: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  pickerRow: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
