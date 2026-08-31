import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EstatePickerSheet } from '@/components/ui/estate-picker-sheet';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import {
  GroupedList,
  GroupedRow,
  OutlineButton,
  ScreenScroll,
  ScreenShell,
  SectionLabel,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { EstateColors } from '@/constants/theme';
import { useInvitationStore } from '@/store/invitation-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { useCan, useManagedEstates } from '@/lib/entitlements/capabilities';
import { normalizeInviteRole } from '@/types';

export default function GuestDetail() {
  const { t } = useTranslation();
  const { guestId } = useLocalSearchParams<{ guestId: string }>();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const can = useCan();
  const { invitations, revokeInvitation, updateInvitationRole } = useInvitationStore();
  const profileById = useProfileStore((s) => s.byId);
  const { estates, estateIds, roleById } = useManagedEstates();
  const [pickerOpen, setPickerOpen] = useState(false);

  /** §3.1 reserves promoting, demoting and removing hosts to the sponsor. */
  const isSponsorOf = (estateId: string) => roleById[estateId] === 'sponsor';
  const canChangeRole = (estateId: string) => isSponsorOf(estateId);
  const canRevoke = (estateId: string, role: string) =>
    isSponsorOf(estateId) || normalizeInviteRole(role) !== 'owner';

  const estateColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    estates.forEach((e, i) => { map[e.id] = EstateColors[i % EstateColors.length]; });
    return map;
  }, [estates]);

  const guestInvitations = useMemo(
    () => invitations.filter(
      (inv) => inv.guestId === guestId && estateIds.includes(inv.estateId) && inv.status === 'accepted'
    ),
    [invitations, guestId, estateIds]
  );

  const canRemoveAll = guestInvitations.every((inv) =>
    canRevoke(inv.estateId, inv.role ?? 'guest')
  );

  /** Invites are authored per property, so adding access routes through a picker. */
  const addableEstates = useMemo(
    () =>
      estates.filter(
        (e) =>
          (can('guests.invite', e.id) || can('owners.invite', e.id)) &&
          !guestInvitations.some((inv) => inv.estateId === e.id)
      ),
    [estates, can, guestInvitations]
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
      `Current role: ${normalized === 'owner' ? 'Host' : 'Guest'}`,
      [
        ...others.map((r) => ({
          text: r === 'owner' ? 'Host' : 'Guest',
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
    <ScreenShell title={t('titles.guest')}>
      <EstatePickerSheet
        visible={pickerOpen}
        title={t('guestsList.pickPropertyToInvite')}
        estates={addableEstates}
        onPick={(estateId) => {
          setPickerOpen(false);
          router.push(`/(app)/estates/${estateId}/guests/invite` as never);
        }}
        onClose={() => setPickerOpen(false)}
      />
      <ScreenScroll gap={12}>
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.tint + '20' }]}>
            <ThemedText style={[styles.avatarText, { color: colors.tint }]}>{initial}</ThemedText>
          </View>
          <View style={styles.profileInfo}>
            <ThemedText type="defaultSemiBold" style={styles.profileName}>{displayName}</ThemedText>
            {!!emailHint && (
              <ThemedText style={[styles.profileEmail, { color: colors.textSecondary }]}>{emailHint}</ThemedText>
            )}
          </View>
        </View>

        <SectionLabel>Property Access</SectionLabel>
        {guestInvitations.length === 0 ? (
          <ThemedText style={[styles.noAccess, { color: colors.textSecondary }]}>No active access.</ThemedText>
        ) : (
          <GroupedList>
            {guestInvitations.map((inv, i) => {
              const estate = estates.find((e) => e.id === inv.estateId);
              const dotColor = estateColorMap[inv.estateId] ?? colors.tint;
              const role = inv.role ?? 'guest';
              return (
                <GroupedRow
                  key={inv.id}
                  title={estate?.name ?? inv.estateId}
                  trailing={
                    <View style={styles.accessTrailing}>
                      {canChangeRole(inv.estateId) ? (
                        <TouchableOpacity
                          style={[styles.roleBadge, { backgroundColor: dotColor + '18' }]}
                          onPress={() => promptChangeRole(inv.id, role)}
                          activeOpacity={0.7}
                        >
                          <ThemedText style={[styles.roleBadgeText, { color: dotColor }]}>
                            {role === 'owner' ? 'Host' : 'Guest'}
                          </ThemedText>
                          <IconSymbol name="chevron.up.chevron.down" size={9} color={dotColor} />
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.roleBadge, { backgroundColor: dotColor + '18' }]}>
                          <ThemedText style={[styles.roleBadgeText, { color: dotColor }]}>
                            {role === 'owner' ? 'Host' : 'Guest'}
                          </ThemedText>
                        </View>
                      )}
                      {canRevoke(inv.estateId, role) && (
                        <TouchableOpacity
                          style={[styles.revokeBtn, { backgroundColor: colors.error + '12', borderColor: colors.error + '30' }]}
                          onPress={() => confirmRevoke(inv.id, estate?.name ?? inv.estateId)}
                          activeOpacity={0.75}
                        >
                          <ThemedText style={[styles.revokeBtnText, { color: colors.error }]}>Revoke</ThemedText>
                        </TouchableOpacity>
                      )}
                    </View>
                  }
                  isLast={i === guestInvitations.length - 1}
                  icon="building.2.fill"
                  iconColor={dotColor}
                  iconBackgroundColor={dotColor + '22'}
                />
              );
            })}
          </GroupedList>
        )}

        {addableEstates.length > 0 && (
          <OutlineButton
            label={t('guestsList.addToAnotherProperty')}
            icon="plus.circle.fill"
            onPress={() => {
              if (addableEstates.length === 1) {
                router.push(`/(app)/estates/${addableEstates[0].id}/guests/invite` as never);
                return;
              }
              setPickerOpen(true);
            }}
          />
        )}

        {guestInvitations.length > 0 && canRemoveAll && (
          <View style={[styles.dangerZone, { borderColor: colors.error + '30' }]}>
            <SectionLabel>Danger Zone</SectionLabel>
            <TouchableOpacity
              style={[styles.removeBtn, { backgroundColor: colors.error + '12', borderColor: colors.error + '30' }]}
              onPress={confirmRemoveAll}
              activeOpacity={0.75}
            >
              <IconSymbol name="trash.fill" size={16} color={colors.error} />
              <ThemedText style={[styles.removeBtnText, { color: colors.error }]}>Remove Guest</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700' },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 18 },
  profileEmail: { fontSize: 13 },
  noAccess: { fontSize: 14, marginBottom: 8 },
  accessTrailing: { alignItems: 'flex-end', gap: 6 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },
  revokeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  revokeBtnText: { fontSize: 12, fontWeight: '600' },
  dangerZone: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10, marginTop: 8 },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  removeBtnText: { fontSize: 14, fontWeight: '700' },
});
