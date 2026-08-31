import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { SectionHeader } from '@/components/ui/section-header';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, EstateColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';

export default function GuestDetail() {
  const { t } = useTranslation();
  const { guestId } = useLocalSearchParams<{ guestId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const { invitations, revokeInvitation, updateInvitationRole } = useInvitationStore();
  const profileById = useProfileStore((s) => s.byId);

  const estates = useMemo(
    () => allEstates.filter((e) => e.ownerId === currentUser?.id),
    [allEstates, currentUser?.id]
  );
  const estateIds = useMemo(() => estates.map((e) => e.id), [estates]);

  const estateColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    estates.forEach((e, i) => { map[e.id] = EstateColors[i % EstateColors.length]; });
    return map;
  }, [estates]);

  // All accepted invitations for this guest across owner's estates
  const guestInvitations = useMemo(
    () => invitations.filter(
      (inv) => inv.guestId === guestId && estateIds.includes(inv.estateId) && inv.status === 'accepted'
    ),
    [invitations, guestId, estateIds]
  );

  const emailHint = guestInvitations.find((i) => i.guestEmail)?.guestEmail;
  const displayName = resolveUserDisplayName(guestId, profileById, emailHint);
  const initial = displayName.charAt(0).toUpperCase();

  function confirmRevoke(invId: string, estateName: string) {
    Alert.alert(
      'Revoke Access',
      `Remove ${displayName}'s access to ${estateName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => {
            revokeInvitation(invId);
            // If no more accesses, go back to list
            if (guestInvitations.length <= 1) router.back();
          },
        },
      ]
    );
  }

  function promptChangeRole(invId: string, currentRole: string) {
    const ROLES = ['guest', 'owner'] as const;
    const normalized = currentRole === 'coOwner' ? 'owner' : currentRole;
    const others = ROLES.filter((r) => r !== normalized);
    Alert.alert(
      'Change Role',
      `Current role: ${normalized === 'owner' ? 'Owner' : 'Guest'}`,
      [
        ...others.map((r) => ({
          text: r === 'owner' ? 'Owner' : 'Guest',
          onPress: () => void updateInvitationRole(invId, r),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  }

  function confirmRemoveAll() {
    Alert.alert(
      'Remove Guest',
      `Revoke all property access for ${displayName}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            guestInvitations.forEach((inv) => revokeInvitation(inv.id));
            router.back();
          },
        },
      ]
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>{t('titles.guest')}</ThemedText>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}>
        {/* Guest profile card */}
        <View style={[styles.profileCard, { backgroundColor: colors.background, borderColor: colors.icon + '22' }]}>
          <View style={[styles.avatar, { backgroundColor: colors.tint + '20' }]}>
            <ThemedText style={[styles.avatarText, { color: colors.tint }]}>{initial}</ThemedText>
          </View>
          <View style={styles.profileInfo}>
            <ThemedText type="defaultSemiBold" style={styles.profileName}>{displayName}</ThemedText>
            {!!emailHint && (
              <ThemedText style={[styles.profileEmail, { color: colors.icon }]}>{emailHint}</ThemedText>
            )}
          </View>
        </View>

        {/* Property access */}
        <SectionHeader title="Property Access" />
        {guestInvitations.length === 0 ? (
          <ThemedText style={[styles.noAccess, { color: colors.icon }]}>No active access.</ThemedText>
        ) : (
          <View style={styles.accessList}>
            {guestInvitations.map((inv) => {
              const estate = estates.find((e) => e.id === inv.estateId);
              const dotColor = estateColorMap[inv.estateId] ?? colors.tint;
              const role = inv.role ?? 'guest';
              return (
                <View
                  key={inv.id}
                  style={[styles.accessRow, { backgroundColor: colors.background, borderColor: colors.icon + '22' }]}
                >
                  <View style={[styles.estateDot, { backgroundColor: dotColor }]} />
                  <View style={styles.accessInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.accessEstate}>
                      {estate?.name ?? inv.estateId}
                    </ThemedText>
                    <TouchableOpacity
                      style={[styles.roleBadge, { backgroundColor: dotColor + '18' }]}
                      onPress={() => promptChangeRole(inv.id, role)}
                      activeOpacity={0.7}
                    >
                      <ThemedText style={[styles.roleBadgeText, { color: dotColor }]}>
                        {role === 'owner' ? 'Owner' : 'Guest'}
                      </ThemedText>
                      <IconSymbol name="chevron.up.chevron.down" size={9} color={dotColor} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={[styles.revokeBtn, { backgroundColor: '#ef444412', borderColor: '#ef444430' }]}
                    onPress={() => confirmRevoke(inv.id, estate?.name ?? inv.estateId)}
                    activeOpacity={0.75}
                  >
                    <ThemedText style={styles.revokeBtnText}>Revoke</ThemedText>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Add to another property */}
        <TouchableOpacity
          style={[styles.addPropertyBtn, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '30' }]}
          onPress={() => router.push('/(app)/stays?tab=invite' as never)}
          activeOpacity={0.75}
        >
          <IconSymbol name="plus.circle.fill" size={18} color={colors.tint} />
          <ThemedText style={[styles.addPropertyText, { color: colors.tint }]}>
            Add to Another Property
          </ThemedText>
        </TouchableOpacity>

        {/* Danger zone */}
        {guestInvitations.length > 0 && (
          <View style={[styles.dangerZone, { borderColor: '#ef444430' }]}>
            <ThemedText style={[styles.dangerLabel, { color: colors.icon }]}>Danger Zone</ThemedText>
            <TouchableOpacity
              style={[styles.removeBtn, { backgroundColor: '#ef444412', borderColor: '#ef444430' }]}
              onPress={confirmRemoveAll}
              activeOpacity={0.75}
            >
              <IconSymbol name="trash.fill" size={16} color="#ef4444" />
              <ThemedText style={styles.removeBtnText}>Remove Guest</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 24, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, gap: 8 },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700' },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 18 },
  profileEmail: { fontSize: 13 },

  accessList: { gap: 8, marginBottom: 4 },
  accessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  estateDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  accessInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  accessEstate: { fontSize: 14 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },
  revokeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  revokeBtnText: { fontSize: 12, fontWeight: '600', color: '#ef4444' },
  noAccess: { fontSize: 14, marginBottom: 8 },

  addPropertyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 8,
  },
  addPropertyText: { fontSize: 14, fontWeight: '600' },

  dangerZone: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10, marginTop: 8 },
  dangerLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  removeBtnText: { fontSize: 14, fontWeight: '700', color: '#ef4444' },
});
