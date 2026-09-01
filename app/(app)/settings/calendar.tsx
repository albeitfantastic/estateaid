import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  GroupedList,
  GroupedRow,
  ScreenFootnote,
  ScreenScroll,
  ScreenShell,
  SectionLabel,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { Layout } from '@/constants/theme';
import {
  enableCalendarExport,
  getCalendarExportPrefs,
  setCalendarExportPrefs,
  type CalendarExportPrefs,
} from '@/lib/calendar-export';
import {
  isDeviceCalendarSupported,
  listWritableCalendars,
  pickCalendarForKind,
  type CalendarKind,
} from '@/lib/device-calendar';
import { useAuthStore } from '@/store/auth-store';

export default function CalendarSettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useScreenTheme();
  const userId = useAuthStore((s) => s.currentUser?.id);
  const [prefs, setPrefs] = useState<CalendarExportPrefs | null>(null);
  const [hasApple, setHasApple] = useState(false);
  const [hasGoogle, setHasGoogle] = useState(false);

  const refreshSources = useCallback(async () => {
    if (!isDeviceCalendarSupported()) {
      setHasApple(false);
      setHasGoogle(false);
      return;
    }
    const list = await listWritableCalendars();
    setHasApple(list.some((c) => c.kind === 'apple'));
    setHasGoogle(list.some((c) => c.kind === 'google'));
  }, []);

  useEffect(() => {
    void getCalendarExportPrefs(userId).then(setPrefs);
    void refreshSources();
  }, [userId, refreshSources]);

  async function toggleMaster(v: boolean) {
    if (!userId) return;
    if (!isDeviceCalendarSupported()) {
      Alert.alert(t('calendarSettings.title'), t('calendarSettings.webOnly'));
      return;
    }
    if (!v) {
      const next = await setCalendarExportPrefs({ enabled: false }, userId);
      setPrefs(next);
      return;
    }
    const result = await enableCalendarExport(userId);
    setPrefs(result.prefs);
    await refreshSources();
    if (!result.ok) {
      Alert.alert(t('calendarSettings.title'), t('calendarSettings.permissionDenied'));
      return;
    }
    if (result.missingGoogle) {
      Alert.alert(t('calendarSettings.google'), t('calendarSettings.googleMissing'));
    }
  }

  async function toggleKind(kind: CalendarKind, v: boolean) {
    if (!userId || !prefs) return;
    if (!v) {
      const next = await setCalendarExportPrefs(
        kind === 'apple' ? { appleEnabled: false } : { googleEnabled: false },
        userId
      );
      setPrefs(next);
      return;
    }
    const picked = await pickCalendarForKind(kind);
    if (!picked) {
      Alert.alert(
        kind === 'google' ? t('calendarSettings.google') : t('calendarSettings.apple'),
        kind === 'google' ? t('calendarSettings.googleMissing') : t('calendarSettings.appleMissing')
      );
      return;
    }
    const next = await setCalendarExportPrefs(
      kind === 'apple'
        ? { appleEnabled: true, appleCalendarId: picked.id }
        : { googleEnabled: true, googleCalendarId: picked.id },
      userId
    );
    setPrefs(next);
    await refreshSources();
  }

  const web = !isDeviceCalendarSupported();
  const masterOn = !!prefs?.enabled;

  return (
    <ScreenShell title={t('calendarSettings.title')}>
      <ScreenScroll contentContainerStyle={styles.scroll}>
        {web ? <ScreenFootnote>{t('calendarSettings.webOnly')}</ScreenFootnote> : null}
        {Platform.OS === 'ios' && masterOn && !hasGoogle ? (
          <ScreenFootnote>{t('calendarSettings.googleMissing')}</ScreenFootnote>
        ) : null}

        <SectionLabel>{t('calendarSettings.destinations')}</SectionLabel>
        <GroupedList>
          <GroupedRow
            title={t('calendarSettings.master')}
            subtitle={t('calendarSettings.masterSub')}
            trailing={
              <Switch
                value={masterOn}
                disabled={!prefs || web}
                onValueChange={(v) => void toggleMaster(v)}
                trackColor={{ false: colors.border, true: colors.tint }}
                thumbColor={colors.textOnBrand}
              />
            }
            isLast={web}
          />
          {!web ? (
            <>
              <GroupedRow
                title={t('calendarSettings.apple')}
                subtitle={
                  Platform.OS === 'ios'
                    ? t('calendarSettings.appleSub')
                    : t('calendarSettings.appleMissing')
                }
                trailing={
                  <Switch
                    value={!!prefs?.appleEnabled}
                    disabled={!prefs || !masterOn || Platform.OS !== 'ios'}
                    onValueChange={(v) => void toggleKind('apple', v)}
                    trackColor={{ false: colors.border, true: colors.tint }}
                    thumbColor={colors.textOnBrand}
                  />
                }
              />
              <GroupedRow
                title={t('calendarSettings.google')}
                subtitle={t('calendarSettings.googleSub')}
                trailing={
                  <Switch
                    value={!!prefs?.googleEnabled}
                    disabled={!prefs || !masterOn}
                    onValueChange={(v) => void toggleKind('google', v)}
                    trackColor={{ false: colors.border, true: colors.tint }}
                    thumbColor={colors.textOnBrand}
                  />
                }
                isLast
              />
            </>
          ) : null}
        </GroupedList>
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: Layout.sectionGap - 8 },
});
