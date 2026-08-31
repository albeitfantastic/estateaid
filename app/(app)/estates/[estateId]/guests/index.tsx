import { Alert, ScrollView, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { HostProLockTouchable } from '@/components/ui/host-pro-lock';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionHeader } from '@/components/ui/section-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCan } from '@/lib/entitlements/capabilities';
import { openHostCapabilityDenied } from '@/lib/entitlements/host-gate';
import { buildMessengerInviteShareMessage } from '@/lib/invite-messages';
import { pendingInviteRecipient } from '@/lib/pending-invite-recipient';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';

export default function GuestsList() {
  const { t } = useTranslation();
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const can = useCan();
  const canInvite = can('guests.invite', { estateId });
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { revokeInvitation, deleteInvitation } = useInvitationStore();
  const allInvitations = useInvitationStore((s) => s.invitations);
  const profileById = useProfileStore((s) => s.byId);
  const { getEstateById } = useEstateStore();
  const estate = getEstateById(estateId);

  const invitations = useMemo(
    () => allInvitations.filter((i) => i.estateId === estateId && i.status !== 'revoked'),
    [allInvitations, estateId]
  );

  const acceptedInvites = useMemo(
    () => invitations.filter((i) => i.status === 'accepted'),
    [invitations]
  );
  const pendingInvites = useMemo(
    () => invitations.filter((i) => i.status === 'pending'),
    [invitations]
  );
  const otherInvites = useMemo(
    () => invitations.filter((i) => i.status !== 'accepted' && i.status !== 'pending'),
    [invitations]
  );

  function goInvite() {
    if (!canInvite) {
      openHostCapabilityDenied(estateId, 'guests.invite', `/(app)/estates/${estateId}/guests`);
      return;
    }
    router.push(`/(app)/estates/${estateId}/guests/invite` as never);
  }

  function confirmRevokeAccess(id: string, label: string) {
    Alert.alert('Revoke access', `Remove access for ${label}? They will lose access to this property.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: () => revokeInvitation(id) },
    ]);
  }

  function confirmDelete(id: string, label: string) {
    Alert.alert('Delete invitation', `Delete invitation ${label}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteInvitation(id).then(({ error }) => {
            if (error) Alert.alert('Could not delete', error);
          });
        },
      },
    ]);
  }

  function shareCode(code: string, note?: string, role = 'guest' as const) {
    if (!estate) return;
    Share.share({
      message: buildMessengerInviteShareMessage(
        [{ estateName: estate.name, inviteCode: code, role }],
        { note, openInviteSuffix: 'Enter your code after signing up as a Guest.' }
      ),
    });
  }

  function guestLabel(inv: (typeof invitations)[0]) {
    if (inv.guestId) {
      return resolveUserDisplayName(inv.guestId, profileById, inv.guestEmail);
    }
    return inv.guestEmail ?? inv.inviteCode;
  }

  const isEmpty = invitations.length === 0;

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>
          {t('titles.guests')}
        </ThemedText>
        <HostProLockTouchable
          locked={!canInvite}
          feature="guests.invite"
          returnTo={`/(app)/estates/${estateId}/guests`}
          shrinkToContent
          onPress={goInvite}
          style={[styles.addBtn, { backgroundColor: colors.tint }]}
          activeOpacity={0.8}
        >
          <IconSymbol name="plus" size={20} color="#fff" />
        </HostProLockTouchable>
      </View>

      {isEmpty ? (
        <EmptyState
          icon="person.2.fill"
          title="No guests yet"
          subtitle="Invite guests to give them access to this estate."
          actionLabel="Invite Guest"
          onAction={goInvite}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}>
          {acceptedInvites.length > 0 && (
            <>
              <SectionHeader
                title={`${acceptedInvites.length} Guest${acceptedInvites.length !== 1 ? 's' : ''}`}
              />
              {acceptedInvites.map((inv) => {
                const label = guestLabel(inv);
                const initial = label.charAt(0).toUpperCase();
                return (
                  <View
                    key={inv.id}
                    style={[
                      styles.row,
                      { borderColor: colors.icon + '22', backgroundColor: colors.surface ?? colors.background },
                    ]}
                  >
                    <View style={[styles.avatar, { backgroundColor: colors.tint + '15' }]}>
                      <ThemedText style={[styles.avatarText, { color: colors.tint }]}>{initial}</ThemedText>
                    </View>
                    <View style={styles.info}>
                      <ThemedText type="defaultSemiBold" style={styles.nameText}>
                        {label}
                      </ThemedText>
                      <View style={styles.metaRow}>
                        <Badge
                          label={inv.role === 'owner' ? t('ownerInvite.estateRoleCoOwnerLabel') : 'Guest'}
                          variant={inv.status as never}
                        />
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#ef444415' }]}
                      onPress={() => confirmRevokeAccess(inv.id, label)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <ThemedText style={styles.revokeText}>Revoke</ThemedText>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          )}

          {pendingInvites.length > 0 && (
            <>
              <SectionHeader
                title={`${pendingInvites.length} Pending Invite${pendingInvites.length !== 1 ? 's' : ''}`}
              />
              {pendingInvites.map((inv) => {
                const recipient = pendingInviteRecipient(inv);
                return (
                <View
                  key={inv.id}
                  style={[
                    styles.row,
                    { borderColor: colors.icon + '22', backgroundColor: colors.surface ?? colors.background },
                  ]}
                >
                  <View style={[styles.keyIcon, { backgroundColor: colors.tint + '15' }]}>
                    <IconSymbol name="key.fill" size={20} color={colors.tint} />
                  </View>
                  <View style={styles.info}>
                    <View style={styles.codeRow}>
                      <ThemedText type="defaultSemiBold" style={styles.codeText}>
                        {recipient ?? t('ownerInvite.inviteeUnset')}
                      </ThemedText>
                      <Badge label={inv.status} variant={inv.status as never} />
                    </View>
                    <ThemedText style={[styles.sub, { color: colors.icon, fontFamily: 'monospace', letterSpacing: 1 }]}>
                      {inv.inviteCode}
                    </ThemedText>
                    {inv.message ? (
                      <ThemedText style={[styles.sub, { color: colors.icon }]} numberOfLines={2}>
                        {inv.message}
                      </ThemedText>
                    ) : null}
                  </View>
                  <View style={styles.rowActions}>
                    <TouchableOpacity
                      style={[styles.iconBtn, { backgroundColor: colors.tint + '15' }]}
                      onPress={() => shareCode(inv.inviteCode, inv.message, inv.role ?? 'guest')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <IconSymbol name="square.and.arrow.up" size={16} color={colors.tint} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconBtn, { backgroundColor: '#ef444415' }]}
                      onPress={() => confirmDelete(inv.id, inv.inviteCode)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel="Delete invitation"
                    >
                      <IconSymbol name="trash" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                );
              })}
            </>
          )}

          {otherInvites.length > 0 && (
            <>
              <SectionHeader title="Other" />
              {otherInvites.map((inv) => {
                const label = inv.guestEmail ?? inv.inviteCode;
                return (
                  <View
                    key={inv.id}
                    style={[
                      styles.row,
                      { borderColor: colors.icon + '22', backgroundColor: colors.surface ?? colors.background },
                    ]}
                  >
                    <View style={styles.info}>
                      <View style={styles.codeRow}>
                        <ThemedText type="defaultSemiBold" style={styles.codeText}>
                          {label}
                        </ThemedText>
                        <Badge label={inv.status} variant={inv.status as never} />
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.iconBtn, { backgroundColor: '#ef444415' }]}
                      onPress={() => confirmDelete(inv.id, label)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <IconSymbol name="trash" size={16} color="#ef4444" />
                    </TouchableOpacity>
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
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  keyIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 4 },
  nameText: { fontSize: 15 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  codeText: { fontSize: 16, letterSpacing: 2, fontFamily: 'monospace' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sub: { fontSize: 12 },
  rowActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  revokeText: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
});
