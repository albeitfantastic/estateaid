import { Alert, ScrollView, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/empty-state';
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
import { buildFullInviteMessage } from '@/lib/invite-messages';

export default function GuestsIndex() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const { invitations, revokeInvitation } = useInvitationStore();
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

  // Active guests: group accepted invitations by guestId
  const guestAccess = useMemo(() => {
    const map: Record<string, { estateId: string; invId: string; role: string }[]> = {};
    invitations
      .filter((inv) => estateIds.includes(inv.estateId) && inv.status === 'accepted' && inv.guestId)
      .forEach((inv) => {
        if (!map[inv.guestId!]) map[inv.guestId!] = [];
        map[inv.guestId!].push({ estateId: inv.estateId, invId: inv.id, role: inv.role ?? 'guest' });
      });
    return map;
  }, [invitations, estateIds]);

  const activeGuests = Object.entries(guestAccess);

  // Pending invitations
  const pendingInvites = useMemo(
    () => invitations.filter((inv) => estateIds.includes(inv.estateId) && inv.status === 'pending'),
    [invitations, estateIds]
  );

  function confirmRevokePending(invId: string, code: string) {
    Alert.alert('Revoke Invite', `Revoke code ${code}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: () => revokeInvitation(invId) },
    ]);
  }

  function sharePendingCode(invId: string) {
    const inv = invitations.find((i) => i.id === invId);
    if (!inv) return;
    const estate = estates.find((e) => e.id === inv.estateId);
    const role = inv.role ?? 'guest';
    Share.share({
      message: buildFullInviteMessage({
        estateName: estate?.name ?? 'your property',
        inviteCode: inv.inviteCode,
        role,
        note: inv.message,
        footerLine:
          role === 'guest' ? 'Enter your code after signing up as a Guest.' : 'Enter your code after signing up.',
      }),
    });
  }

  const isEmpty = activeGuests.length === 0 && pendingInvites.length === 0;

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>{t('titles.guests')}</ThemedText>
        <TouchableOpacity
          style={[styles.inviteBtn, { backgroundColor: colors.tint }]}
          onPress={() => router.push('/(owner)/invite' as never)}
          activeOpacity={0.8}
        >
          <IconSymbol name="plus" size={18} color="#fff" />
          <ThemedText style={styles.inviteBtnText}>Invite</ThemedText>
        </TouchableOpacity>
      </View>

      {isEmpty ? (
        <EmptyState
          icon="person.2.fill"
          title="No guests yet"
          subtitle="Invite people to give them access to your properties."
          actionLabel="Invite User"
          onAction={() => router.push('/(owner)/invite' as never)}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}>

          {/* Active guests */}
          {activeGuests.length > 0 && (
            <>
              <SectionHeader title={`${activeGuests.length} Guest${activeGuests.length !== 1 ? 's' : ''}`} />
              {activeGuests.map(([guestId, accesses]) => {
                const emailHint = invitations.find(
                  (i) => i.guestId === guestId && i.guestEmail
                )?.guestEmail;
                const displayName = resolveUserDisplayName(guestId, profileById, emailHint);
                const initial = displayName.charAt(0).toUpperCase();
                return (
                  <TouchableOpacity
                    key={guestId}
                    style={[styles.row, { borderColor: colors.icon + '22', backgroundColor: colors.background }]}
                    onPress={() => router.push(`/(owner)/guests/${guestId}` as never)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.avatar, { backgroundColor: colors.tint + '20' }]}>
                      <ThemedText style={[styles.avatarText, { color: colors.tint }]}>{initial}</ThemedText>
                    </View>
                    <View style={styles.rowInfo}>
                      <ThemedText type="defaultSemiBold" style={styles.guestName}>{displayName}</ThemedText>
                      {!!emailHint && (
                        <ThemedText style={[styles.guestEmail, { color: colors.icon }]}>{emailHint}</ThemedText>
                      )}
                      <View style={styles.accessPills}>
                        {accesses.map(({ estateId, role }) => {
                          const estate = estates.find((e) => e.id === estateId);
                          const dotColor = estateColorMap[estateId] ?? colors.tint;
                          return (
                            <View key={estateId} style={[styles.accessPill, { backgroundColor: dotColor + '18', borderColor: dotColor + '44' }]}>
                              <View style={[styles.pillDot, { backgroundColor: dotColor }]} />
                              <ThemedText style={[styles.pillText, { color: dotColor }]}>
                                {estate?.name ?? estateId}{role !== 'guest' ? ` · ${role}` : ''}
                              </ThemedText>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                    <IconSymbol name="chevron.right" size={16} color={colors.icon} />
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* Pending invitations */}
          {pendingInvites.length > 0 && (
            <>
              <SectionHeader title={`${pendingInvites.length} Pending Invite${pendingInvites.length !== 1 ? 's' : ''}`} />
              {pendingInvites.map((inv) => {
                const estate = estates.find((e) => e.id === inv.estateId);
                const dotColor = estateColorMap[inv.estateId] ?? colors.tint;
                const role = inv.role ?? 'guest';
                return (
                  <View
                    key={inv.id}
                    style={[styles.row, { borderColor: colors.icon + '22', backgroundColor: colors.background }]}
                  >
                    <View style={[styles.keyIcon, { backgroundColor: colors.icon + '12' }]}>
                      <IconSymbol name="key.fill" size={18} color={colors.icon} />
                    </View>
                    <View style={styles.rowInfo}>
                      <ThemedText type="defaultSemiBold" style={[styles.code, { color: colors.text }]}>
                        {inv.inviteCode}
                      </ThemedText>
                      <View style={styles.accessPills}>
                        <View style={[styles.accessPill, { backgroundColor: dotColor + '18', borderColor: dotColor + '44' }]}>
                          <View style={[styles.pillDot, { backgroundColor: dotColor }]} />
                          <ThemedText style={[styles.pillText, { color: dotColor }]}>
                            {estate?.name ?? inv.estateId}{role !== 'guest' ? ` · ${role}` : ''}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                    <View style={styles.rowActions}>
                      <TouchableOpacity
                        style={[styles.iconBtn, { backgroundColor: colors.tint + '15' }]}
                        onPress={() => sharePendingCode(inv.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <IconSymbol name="square.and.arrow.up" size={15} color={colors.tint} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.iconBtn, { backgroundColor: '#ef444415' }]}
                        onPress={() => confirmRevokePending(inv.id, inv.inviteCode)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <IconSymbol name="xmark" size={15} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 28, fontWeight: '700' },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  inviteBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { paddingHorizontal: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 18, fontWeight: '700' },
  keyIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowInfo: { flex: 1, gap: 4 },
  guestName: { fontSize: 15 },
  guestEmail: { fontSize: 12 },
  code: { fontSize: 15, fontFamily: 'monospace', letterSpacing: 1 },
  accessPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  accessPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: '600' },
  rowActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
