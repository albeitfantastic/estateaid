import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getNotificationCategoryPrefs,
  setNotificationCategoryPref,
  type NotificationCategory,
} from '@/lib/notifications';
import { useAuthStore } from '@/store/auth-store';
import { clearPushToken, registerPushToken } from '@/lib/notifications';

const ROWS: { key: NotificationCategory; label: string; body: string }[] = [
  { key: 'stay_requests', label: 'Stay requests', body: 'When a guest requests dates' },
  { key: 'stay_decisions', label: 'Stay decisions', body: 'Approved, declined, or alternate dates' },
  { key: 'stay_reminders', label: 'Stay reminders', body: 'Stay starts tomorrow' },
  { key: 'maintenance', label: 'Maintenance', body: 'New issues on your properties' },
  { key: 'invites', label: 'Invites', body: 'When someone accepts an invite' },
];

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const notificationsEnabled = useAuthStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useAuthStore((s) => s.setNotificationsEnabled);
  const userId = useAuthStore((s) => s.currentUser?.id);
  const [prefs, setPrefs] = useState<Record<NotificationCategory, boolean> | null>(null);

  useEffect(() => {
    void getNotificationCategoryPrefs().then(setPrefs);
  }, []);

  async function toggleMaster(v: boolean) {
    setNotificationsEnabled(v);
    if (!userId) return;
    if (v) await registerPushToken(userId);
    else await clearPushToken(userId);
  }

  async function toggleCategory(key: NotificationCategory, v: boolean) {
    await setNotificationCategoryPref(key, v);
    setPrefs((p) => (p ? { ...p, [key]: v } : p));
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}>
        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold">Push notifications</ThemedText>
            <ThemedText style={{ color: colors.icon, fontSize: 13 }}>
              Master switch for this device
            </ThemedText>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={(v) => void toggleMaster(v)}
            trackColor={{ false: colors.border, true: colors.tint }}
            thumbColor="#fff"
          />
        </View>
        {prefs &&
          ROWS.map((r) => (
            <View key={r.key} style={[styles.row, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">{r.label}</ThemedText>
                <ThemedText style={{ color: colors.icon, fontSize: 13 }}>{r.body}</ThemedText>
              </View>
              <Switch
                value={prefs[r.key]}
                disabled={!notificationsEnabled}
                onValueChange={(v) => void toggleCategory(r.key, v)}
                trackColor={{ false: colors.border, true: colors.tint }}
                thumbColor="#fff"
              />
            </View>
          ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
