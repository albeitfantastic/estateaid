import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { inputBaseStyle } from '@/components/ui/focus-input';
import {
  GroupedList,
  GroupedRow,
  ScreenScroll,
  ScreenShell,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import {
  getNotificationCategoryPrefs,
  setNotificationCategoryPref,
  setPushMasterEnabled,
  type NotificationCategory,
} from '@/lib/notifications';
import { useAuthStore } from '@/store/auth-store';

const ROWS: { key: NotificationCategory; labelKey: string; bodyKey: string }[] = [
  { key: 'stay_requests', labelKey: 'notificationsSettings.stayRequests', bodyKey: 'notificationsSettings.stayRequestsBody' },
  { key: 'stay_decisions', labelKey: 'notificationsSettings.stayDecisions', bodyKey: 'notificationsSettings.stayDecisionsBody' },
  { key: 'stay_reminders', labelKey: 'notificationsSettings.stayReminders', bodyKey: 'notificationsSettings.stayRemindersBody' },
  { key: 'maintenance', labelKey: 'notificationsSettings.maintenance', bodyKey: 'notificationsSettings.maintenanceBody' },
  { key: 'invites', labelKey: 'notificationsSettings.invites', bodyKey: 'notificationsSettings.invitesBody' },
];

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useScreenTheme();
  const notificationsEnabled = useAuthStore((s) => s.notificationsEnabled);
  const userId = useAuthStore((s) => s.currentUser?.id);
  const [prefs, setPrefs] = useState<Record<NotificationCategory, boolean> | null>(null);

  useEffect(() => {
    void getNotificationCategoryPrefs(userId).then(setPrefs);
  }, [userId]);

  async function toggleMaster(v: boolean) {
    if (!userId) return;
    await setPushMasterEnabled(userId, v);
  }

  async function toggleCategory(key: NotificationCategory, v: boolean) {
    await setNotificationCategoryPref(key, v, userId);
    setPrefs((p) => (p ? { ...p, [key]: v } : p));
  }

  return (
    <ScreenShell title={t('notificationsSettings.title')}>
      <ScreenScroll contentContainerStyle={styles.form} gap={16}>
        <View style={styles.field}>
          <ThemedText style={[inputBaseStyle.label, { color: colors.icon }]}>
            {t('notificationsSettings.device')}
          </ThemedText>
          <GroupedList>
            <GroupedRow
              title={t('notificationsSettings.master')}
              subtitle={t('notificationsSettings.masterSub')}
              trailing={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={(v) => void toggleMaster(v)}
                  trackColor={{ false: colors.border, true: colors.tint }}
                  thumbColor={colors.textOnBrand}
                />
              }
              isLast={!prefs}
            />
            {prefs &&
              ROWS.map((r, i) => (
                <GroupedRow
                  key={r.key}
                  title={t(r.labelKey)}
                  subtitle={t(r.bodyKey)}
                  trailing={
                    <Switch
                      value={prefs[r.key]}
                      disabled={!notificationsEnabled}
                      onValueChange={(v) => void toggleCategory(r.key, v)}
                      trackColor={{ false: colors.border, true: colors.tint }}
                      thumbColor={colors.textOnBrand}
                    />
                  }
                  isLast={i === ROWS.length - 1}
                />
              ))}
          </GroupedList>
        </View>
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  form: { paddingTop: 8 },
  field: { gap: 6 },
});
