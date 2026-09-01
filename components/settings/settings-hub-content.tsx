import { useRouter } from 'expo-router';
import { Alert, Linking, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  GroupedList,
  GroupedRow,
  ScreenScroll,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { Layout, Radius } from '@/constants/theme';
import { LEGAL_ROUTES } from '@/lib/legal-routes';
import { setPushMasterEnabled } from '@/lib/notifications';
import { supportMailto } from '@/lib/support';
import { useAccountContext } from '@/lib/entitlements/capabilities';
import { useAuthStore } from '@/store/auth-store';

import type { SettingsDestination } from './settings-sheet';

const SETTINGS_BASE = '/(app)/settings' as const;

const MENU_ITEMS: { icon: string; labelKey?: string; label?: string; dest?: SettingsDestination }[] = [
  { icon: 'person.fill', labelKey: 'common.profile', dest: 'profile' },
  { icon: 'globe', labelKey: 'common.language', dest: 'language' },
  { icon: 'bell.fill', labelKey: 'common.notifications', dest: 'notifications' },
  { icon: 'calendar', labelKey: 'calendarSettings.title', dest: 'calendar' },
  { icon: 'creditcard.fill', labelKey: 'settingsHub.manageSubscription', dest: 'subscription' },
];

export function SettingsHubContent() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useScreenTheme();
  const currentUser = useAuthStore((s) => s.currentUser);
  const themePreference = useAuthStore((s) => s.themePreference);
  const setThemePreference = useAuthStore((s) => s.setThemePreference);
  const notificationsEnabled = useAuthStore((s) => s.notificationsEnabled);
  const signOut = useAuthStore((s) => s.signOut);
  const { slotCount, propertiesSponsored } = useAccountContext();

  const isDark = themePreference === 'dark';
  const slotLabel =
    slotCount > 0
      ? t('common.slotsBadge', { used: propertiesSponsored, total: slotCount })
      : t('common.slotsBadgeNone');
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

  return (
    <ScreenScroll contentContainerStyle={styles.list}>
      <View style={[styles.profileCard, { borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
          <ThemedText style={[styles.avatarText, { color: colors.textOnBrand }]}>{initials}</ThemedText>
        </View>
        <ThemedText type="display" style={styles.profileName} numberOfLines={2}>
          {currentUser?.name}
        </ThemedText>
        <ThemedText style={[styles.email, { color: colors.textSecondary }]}>
          {currentUser?.email}
        </ThemedText>
        <View style={[styles.slotBadge, { backgroundColor: colors.tint + '18' }]}>
          <ThemedText style={[styles.slotText, { color: colors.tint }]}>{slotLabel}</ThemedText>
        </View>
      </View>

      <GroupedList>
        {MENU_ITEMS.map((item) => (
          <GroupedRow
            key={item.dest}
            icon={item.icon}
            title={item.labelKey ? t(item.labelKey) : (item.label ?? '')}
            trailing={<IconSymbol name="chevron.right" size={14} color={colors.icon} />}
            onPress={() => item.dest && pushSection(item.dest)}
          />
        ))}
        <GroupedRow
          icon={isDark ? 'moon.fill' : 'sun.max.fill'}
          title={t('common.darkMode')}
          trailing={
            <Switch
              value={isDark}
              onValueChange={(v) => setThemePreference(v ? 'dark' : 'light')}
              trackColor={{ false: colors.border, true: colors.tint }}
              thumbColor={colors.textOnBrand}
            />
          }
        />
        <GroupedRow
          icon="bell.fill"
          title={t('common.notificationsMaster', { defaultValue: 'Enable push' })}
          trailing={
            <Switch
              value={notificationsEnabled}
              onValueChange={(v) => {
                if (currentUser) void setPushMasterEnabled(currentUser.id, v);
              }}
              trackColor={{ false: colors.border, true: colors.tint }}
              thumbColor={colors.textOnBrand}
            />
          }
        />
        <GroupedRow
          icon="gearshape.fill"
          title="Account"
          trailing={<IconSymbol name="chevron.right" size={14} color={colors.icon} />}
          onPress={() => pushSection('account')}
        />
        <GroupedRow
          icon="questionmark.circle.fill"
          title="Help & Support"
          trailing={<IconSymbol name="chevron.right" size={14} color={colors.icon} />}
          onPress={() => {
            void Linking.openURL(supportMailto('Help & Support', 'I need help with Maison.'));
          }}
        />
        <GroupedRow
          icon="doc.text.fill"
          title={t('common.termsOfService')}
          trailing={<IconSymbol name="chevron.right" size={14} color={colors.icon} />}
          onPress={() => router.push(LEGAL_ROUTES.terms as never)}
        />
        <GroupedRow
          icon="doc.text.fill"
          title={t('common.privacyPolicy')}
          trailing={<IconSymbol name="chevron.right" size={14} color={colors.icon} />}
          onPress={() => router.push(LEGAL_ROUTES.privacy as never)}
        />
        <GroupedRow
          icon="doc.text.fill"
          title={t('common.impressum')}
          trailing={<IconSymbol name="chevron.right" size={14} color={colors.icon} />}
          onPress={() => router.push(LEGAL_ROUTES.impressum as never)}
          isLast
        />
      </GroupedList>

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
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 8, gap: Layout.sectionGap },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarText: { fontSize: 22, fontWeight: '700' },
  profileName: { textAlign: 'center' },
  email: { fontSize: 14, textAlign: 'center' },
  slotBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, marginTop: 4 },
  slotText: { fontSize: 12, fontWeight: '600' },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
});
