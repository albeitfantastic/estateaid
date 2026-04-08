import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Elevation, Layout, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supportMailto } from '@/lib/support';
import { useAccessTier } from '@/lib/access-tier';
import { useAuthStore } from '@/store/auth-store';

import type { SettingsDestination } from './settings-sheet';

const SETTINGS_BASE = '/(app)/settings' as const;

export function SettingsHubContent() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? 'light';
  const colors = Colors[scheme];
  const currentUser = useAuthStore((s) => s.currentUser);
  const selectedTier = useAuthStore((s) => s.selectedTier);
  const themePreference = useAuthStore((s) => s.themePreference);
  const setThemePreference = useAuthStore((s) => s.setThemePreference);
  const notificationsEnabled = useAuthStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useAuthStore((s) => s.setNotificationsEnabled);
  const signOut = useAuthStore((s) => s.signOut);
  const accessTier = useAccessTier();

  const isDark = themePreference === 'dark';
  const tierLabel =
    accessTier === 'standard'
      ? t('common.accessStandard')
      : accessTier === 'trial'
        ? t('common.accessTrial')
        : selectedTier === 'premium'
          ? t('common.premium')
          : t('common.accessPro');
  const initials =
    currentUser?.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? '';

  function pushSection(dest: SettingsDestination) {
    router.push(`${SETTINGS_BASE}/${dest}` as never);
  }

  function menuRow(
    icon: string,
    label: string,
    onPress?: () => void,
    trailing?: ReactNode
  ) {
    return (
      <TouchableOpacity
        key={label}
        style={[styles.row, { borderBottomColor: colors.border }]}
        onPress={onPress}
        disabled={!onPress && !trailing}
        activeOpacity={onPress ? 0.6 : 1}
      >
        <View style={[styles.rowIcon, { backgroundColor: colors.tint + '12' }]}>
          <IconSymbol name={icon as never} size={18} color={colors.tint} />
        </View>
        <ThemedText style={styles.rowLabel}>{label}</ThemedText>
        {trailing ?? <IconSymbol name="chevron.right" size={14} color={colors.icon} />}
      </TouchableOpacity>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Layout.sectionGap + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.profileCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            Elevation.card[scheme],
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
            <ThemedText style={styles.avatarText}>{initials}</ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>
              {currentUser?.name}
            </ThemedText>
            <ThemedText style={[styles.email, { color: colors.textSecondary }]}>{currentUser?.email}</ThemedText>
          </View>
          <View style={[styles.tierBadge, { backgroundColor: colors.tint + '18' }]}>
            <ThemedText style={[styles.tierText, { color: colors.tint }]}>{tierLabel}</ThemedText>
          </View>
        </View>

        {menuRow('person.fill', t('common.profile'), () => pushSection('profile'))}
        {menuRow('globe', t('common.language'), () => pushSection('language'))}
        {menuRow('creditcard.fill', t('settingsHub.manageSubscription'), () => pushSection('subscription'))}
        {menuRow(
          isDark ? 'moon.fill' : 'sun.max.fill',
          t('common.darkMode'),
          undefined,
          <Switch
            value={isDark}
            onValueChange={(v) => setThemePreference(v ? 'dark' : 'light')}
            trackColor={{ false: colors.border, true: colors.tint }}
            thumbColor="#fff"
          />
        )}
        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <View style={styles.notifRowLeft}>
            <View style={[styles.rowIcon, { backgroundColor: colors.tint + '12' }]}>
              <IconSymbol name="bell.fill" size={18} color={colors.tint} />
            </View>
            <ThemedText style={styles.rowLabel}>{t('common.notifications')}</ThemedText>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: colors.border, true: colors.tint }}
            thumbColor="#fff"
          />
        </View>
        {menuRow('gearshape.fill', 'Account', () => pushSection('account'))}
        {menuRow('questionmark.circle.fill', 'Help & Support', () => {
          void Linking.openURL(supportMailto('Help & Support', 'I need help with Maison.'));
        })}
        {menuRow('doc.text.fill', 'Privacy Policy', () => {
          Alert.alert(
            'Privacy Policy',
            'Our privacy policy will be published on the website soon. Contact support if you need details now.'
          );
        })}

        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: colors.error }]}
          onPress={() => {
            Alert.alert(t('settingsHub.signOutTitle'), t('settingsHub.signOutConfirm'), [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('common.signOut'),
                style: 'destructive',
                onPress: () => void signOut().then(() => router.replace('/(auth)' as never)),
              },
            ]);
          }}
          activeOpacity={0.7}
        >
          <IconSymbol name="rectangle.portrait.and.arrow.right" size={16} color={colors.error} />
          <ThemedText style={{ color: colors.error, fontWeight: '600' }}>{t('common.signOut')}</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: Layout.screenPaddingX, paddingTop: Layout.sectionGap - 8 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Layout.sectionGap,
    gap: 14,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  email: { fontSize: 12, marginTop: 2 },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  tierText: { fontSize: 11, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Layout.touchMin,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  rowIcon: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  notifRowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: Layout.sectionGap - 4,
  },
});
