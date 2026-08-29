import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Elevation, Layout, Radius, type ThemeColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { AccessTier } from '@/lib/access-tier';
import { supportMailto } from '@/lib/support';

export type SettingsDestination = 'profile' | 'language' | 'subscription' | 'account' | 'notifications';

export interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  colors: ThemeColors;
  insets: { top: number; bottom: number };
  currentUser: { name: string; email: string } | null;
  accessTier: AccessTier;
  isDark: boolean;
  notificationsOn: boolean;
  onToggleDark: (v: boolean) => void;
  onToggleNotifications: (v: boolean) => void;
  onNavigate: (dest: SettingsDestination) => void;
  onSignOut: () => void;
}

export function SettingsSheet({
  visible,
  onClose,
  colors,
  insets,
  currentUser,
  accessTier,
  isDark,
  notificationsOn,
  onToggleDark,
  onToggleNotifications,
  onNavigate,
  onSignOut,
}: SettingsSheetProps) {
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'light';
  const initials =
    currentUser?.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? '';
  const tierLabel =
    accessTier === 'standard'
      ? t('common.accessStandard')
      : accessTier === 'trial'
        ? t('common.accessTrial')
        : t('common.accessPro');

  function go(dest: SettingsDestination) {
    onClose();
    onNavigate(dest);
  }

  function menuRow(
    icon: string,
    label: string,
    onPress?: () => void,
    trailing?: React.ReactNode
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
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingTop: insets.top + Layout.sectionGap - 4,
              paddingBottom: insets.bottom + Layout.sectionGap,
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <ThemedText type="title" style={styles.sheetTitle}>
              {t('settingsScreens.settingsTitle')}
            </ThemedText>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.icon + '15' }]}>
              <IconSymbol name="xmark" size={16} color={colors.icon} />
            </TouchableOpacity>
          </View>

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
            </View>
            <View style={[styles.tierBadge, { backgroundColor: colors.tint + '18' }]}>
              <ThemedText style={[styles.tierText, { color: colors.tint }]}>{tierLabel}</ThemedText>
            </View>
          </View>

          <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
            {menuRow('person.fill', 'Profile', () => go('profile'))}
            {menuRow('globe', 'Language', () => go('language'))}
            {menuRow('creditcard.fill', 'Manage subscription', () => go('subscription'))}
            {menuRow(
              isDark ? 'moon.fill' : 'sun.max.fill',
              'Dark mode',
              undefined,
              <Switch
                value={isDark}
                onValueChange={onToggleDark}
                trackColor={{ false: colors.border, true: colors.tint }}
                thumbColor="#fff"
              />
            )}

            {menuRow(
              'bell.fill',
              t('common.notifications'),
              undefined,
              <Switch
                value={notificationsOn}
                onValueChange={onToggleNotifications}
                trackColor={{ false: colors.border, true: colors.tint }}
                thumbColor="#fff"
              />
            )}

            {menuRow('gearshape.fill', t('common.account'), () => go('account'))}
            {menuRow('questionmark.circle.fill', t('common.helpSupport'), () => {
              onClose();
              void Linking.openURL(supportMailto(t('common.helpSupport'), t('settingsHub.helpBody')));
            })}
            {menuRow('doc.text.fill', t('common.privacyPolicy'), () => {
              onClose();
              Alert.alert(t('settingsHub.privacyTitle'), t('settingsHub.privacyBody'));
            })}
          </ScrollView>

          <TouchableOpacity
            style={[styles.signOutBtn, { borderColor: colors.error }]}
            onPress={() => {
              onClose();
              Alert.alert(t('settingsHub.signOutTitle'), t('settingsHub.signOutConfirm'), [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('common.signOut'), style: 'destructive', onPress: onSignOut },
              ]);
            }}
            activeOpacity={0.7}
          >
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={16} color={colors.error} />
            <ThemedText style={{ color: colors.error, fontWeight: '600' }}>{t('common.signOut')}</ThemedText>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { flex: 1, maxWidth: 360, paddingHorizontal: Layout.screenPaddingX },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Layout.sectionGap,
  },
  sheetTitle: { fontSize: 24, fontWeight: '700' },
  closeBtn: {
    width: Layout.touchMin,
    height: Layout.touchMin,
    borderRadius: Layout.touchMin / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  menuList: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Layout.touchMin,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  notifRowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: Layout.touchMin,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
});
