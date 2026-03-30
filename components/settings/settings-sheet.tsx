import type { ReactNode } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { supportMailto } from '@/lib/support';
import type { OwnerTier } from '@/store/auth-store';
import type { UserRole } from '@/types';

type ThemeColors = (typeof Colors)['light'];

export type SettingsDestination = 'profile' | 'subscription' | 'account';

export interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  colors: ThemeColors;
  insets: { top: number; bottom: number };
  currentUser: { name: string; email: string } | null;
  userRole: UserRole;
  selectedTier: OwnerTier | null;
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
  userRole,
  selectedTier,
  isDark,
  notificationsOn,
  onToggleDark,
  onToggleNotifications,
  onNavigate,
  onSignOut,
}: SettingsSheetProps) {
  const initials =
    currentUser?.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? '';
  const tierLabel =
    userRole === 'guest'
      ? 'Guest'
      : selectedTier === 'premium'
        ? 'Premium'
        : 'Starter';

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
            { backgroundColor: colors.surface, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
          ]}
        >
          <View style={styles.sheetHeader}>
            <ThemedText type="title" style={styles.sheetTitle}>
              Settings
            </ThemedText>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.icon + '15' }]}>
              <IconSymbol name="xmark" size={16} color={colors.icon} />
            </TouchableOpacity>
          </View>

          <View style={[styles.profileCard, { backgroundColor: colors.tint + '08', borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
              <ThemedText style={styles.avatarText}>{initials}</ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>
                {currentUser?.name}
              </ThemedText>
              <ThemedText style={[styles.email, { color: colors.icon }]}>{currentUser?.email}</ThemedText>
            </View>
            <View style={[styles.tierBadge, { backgroundColor: colors.tint + '18' }]}>
              <ThemedText style={[styles.tierText, { color: colors.tint }]}>{tierLabel}</ThemedText>
            </View>
          </View>

          <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
            {menuRow('person.fill', 'Profile', () => go('profile'))}
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
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <View style={styles.notifRowLeft}>
                <View style={[styles.rowIcon, { backgroundColor: colors.tint + '12' }]}>
                  <IconSymbol name="bell.fill" size={18} color={colors.tint} />
                </View>
                <ThemedText style={styles.rowLabel}>Notifications</ThemedText>
              </View>
              <Switch
                value={notificationsOn}
                onValueChange={onToggleNotifications}
                trackColor={{ false: colors.border, true: colors.tint }}
                thumbColor="#fff"
              />
            </View>
            {menuRow('gearshape.fill', 'Account', () => go('account'))}
            {menuRow('questionmark.circle.fill', 'Help & Support', () => {
              onClose();
              void Linking.openURL(supportMailto('Help & Support', 'I need help with EstateAid.'));
            })}
            {menuRow('doc.text.fill', 'Privacy Policy', () => {
              onClose();
              Alert.alert(
                'Privacy Policy',
                'Our privacy policy will be published on the website soon. Contact support if you need details now.'
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={[styles.signOutBtn, { borderColor: colors.error }]}
            onPress={() => {
              onClose();
              Alert.alert('Sign out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign out', style: 'destructive', onPress: onSignOut },
              ]);
            }}
            activeOpacity={0.7}
          >
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={16} color={colors.error} />
            <ThemedText style={{ color: colors.error, fontWeight: '600' }}>Sign out</ThemedText>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { flex: 1, maxWidth: 340, paddingHorizontal: 20 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sheetTitle: { fontSize: 24, fontWeight: '700' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
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
    paddingVertical: 14,
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
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
});
