import { StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '@/store/auth-store';
import { useAppTheme } from '@/theme/useAppTheme';

export default function ProfileScreen() {
  const { currentUser, clearUser, themePreference, setThemePreference } = useAuthStore();
  const appTheme = useAppTheme();
  const colors = appTheme.colors;
  const router = useRouter();
  const isDark = themePreference === 'dark';

  function switchRole() {
    clearUser();
    router.replace('/(auth)' as never);
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <ThemedText style={styles.avatarText}>
          {currentUser?.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
        </ThemedText>
      </View>
      <ThemedText type="title">{currentUser?.name}</ThemedText>
      <ThemedText style={{ opacity: 0.5 }}>{currentUser?.email}</ThemedText>

      <View style={[styles.settingsBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.settingRow}>
          <ThemedText style={styles.settingLabel}>Dark Mode</ThemedText>
          <Switch
            value={isDark}
            onValueChange={(v) => setThemePreference(v ? 'dark' : 'light')}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.btn, { borderColor: colors.primary }]}
        onPress={switchRole}
      >
        <ThemedText style={{ color: colors.primary, fontWeight: '600' }}>Switch Role</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  settingsBox: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLabel: { fontSize: 16, fontWeight: '500' },
  btn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
});
