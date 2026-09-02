import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, BackHandler, StyleSheet, TouchableOpacity, View } from 'react-native';

import { CalendarColorPicker } from '@/components/guests/calendar-color-picker';
import { ThemedText } from '@/components/themed-text';
import { EstatePickerSheet } from '@/components/ui/estate-picker-sheet';
import { inputBaseStyle } from '@/components/ui/focus-input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
    GroupedList,
    OutlineButton,
    ScreenScroll,
    ScreenShell,
    useScreenTheme,
} from '@/components/ui/screen-layout';
import { EstateColors, Radius } from '@/constants/theme';
import { useCan, useManagedEstates } from '@/lib/entitlements/capabilities';
import { resolveGuestCalendarColor } from '@/lib/guest-calendar-color';
import { useInvitationStore } from '@/store/invitation-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { normalizeInviteRole } from '@/types';

function guestsAndHostsHref(estateId?: string) {
  return estateId ? `/(app)/estates/${estateId}/guests` : '/(app)/guests';
}

export default function GuestDetail() {
  const { t } = useTranslation();
  const { guestId, estateId: routeEstateId } = useLocalSearchParams<{
    guestId: string;
    estateId?: string;
  }>();
  const router = useRouter();
  const listEstateId = Array.isArray(routeEstateId) ? routeEstateId[0] : routeEstateId;
  const guestsHref = guestsAndHostsHref(listEstateId);
  const { colors } = useScreenTheme();
  const can = useCan();
  const { invitations, revokeInvitation, updateInvitationRole, updateGuestCalendarColor } = useInvitationStore();
  const profileById = useProfileStore((s) => s.byId);
  const { estates, estateIds, roleById } = useManagedEstates();
  const [pickerOpen, setPickerOpen] = useState(false);

  function goBackToGuests() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(guestsHref as never);
  }

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goBackToGuests();
        return true;
      });
      return () => sub.remove();
    }, [guestsHref, router])
  );

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
  const guestColor = resolveGuestCalendarColor(guestId, invitations);
  const sponsoredEstateIds = useMemo(
    () => guestInvitations.filter((inv) => isSponsorOf(inv.estateId)).map((inv) => inv.estateId),
    [guestInvitations, roleById]
  );
  const canSetCalendarColor = sponsoredEstateIds.length > 0;

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
            if (guestInvitations.length <= 1) goBackToGuests();
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
      t('guestsList.removeGuest'),
      `Revoke all property access for ${displayName}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            guestInvitations.forEach((inv) => revokeInvitation(inv.id));
            goBackToGuests();
          },
        },
      ]
    );
  }

  return (
    <ScreenShell title={t('titles.guest')} onBack={goBackToGuests}>
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
      <ScreenScroll contentContainerStyle={styles.form} gap={16}>
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: guestColor + '20' }]}>
            <ThemedText style={[styles.avatarText, { color: guestColor }]}>{initial}</ThemedText>
          </View>
          <View style={styles.profileInfo}>
            <ThemedText type="defaultSemiBold" style={styles.profileName}>{displayName}</ThemedText>
            {!!emailHint && (
              <ThemedText style={[styles.profileEmail, { color: colors.textSecondary }]}>{emailHint}</ThemedText>
            )}
          </View>
        </View>

        {canSetCalendarColor ? (
          <View style={styles.field}>
            <ThemedText style={[inputBaseStyle.label, { color: colors.icon }]}>
              {t('guestsList.calendarColor')}
            </ThemedText>
            <CalendarColorPicker
              value={guestColor}
              onChange={(color) => {
                if (!guestId) return;
                void updateGuestCalendarColor(guestId, color, sponsoredEstateIds);
              }}
            />
          </View>
        ) : null}

        <View style={styles.field}>
          <ThemedText style={[inputBaseStyle.label, { color: colors.icon }]}>
            {t('guestsList.propertyAccess')}
          </ThemedText>
          {guestInvitations.length === 0 ? (
            <ThemedText style={[styles.noAccess, { color: colors.textSecondary }]}>
              {t('guestsList.emptyTitle')}
            </ThemedText>
          ) : (
            <GroupedList>
              {guestInvitations.map((inv, i) => {
                const estate = estates.find((e) => e.id === inv.estateId);
                const dotColor = estateColorMap[inv.estateId] ?? colors.tint;
                const role = inv.role ?? 'guest';
                const roleLabel =
                  normalizeInviteRole(role) === 'owner'
                    ? t('ownerInvite.estateRoleCoOwnerLabel')
                    : t('ownerInvite.estateRoleGuestLabel');
                const showRevoke = canRevoke(inv.estateId, role);
                const canPickRole = canChangeRole(inv.estateId);
                return (
                  <View
                    key={inv.id}
                    style={[
                      styles.accessRow,
                      i < guestInvitations.length - 1 && {
                        borderBottomColor: colors.border,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <View style={[styles.accessIcon, { backgroundColor: dotColor + '22' }]}>
                      <IconSymbol name="building.2.fill" size={18} color={dotColor} />
                    </View>
                    <ThemedText type="defaultSemiBold" style={styles.accessName} numberOfLines={1}>
                      {estate?.name ?? inv.estateId}
                    </ThemedText>
                    <TouchableOpacity
                      style={[
                        styles.actionChip,
                        {
                          borderColor: canPickRole ? colors.border : colors.border,
                          backgroundColor: colors.surfaceMuted ?? colors.surface,
                        },
                      ]}
                      onPress={canPickRole ? () => promptChangeRole(inv.id, role) : undefined}
                      disabled={!canPickRole}
                      activeOpacity={canPickRole ? 0.7 : 1}
                    >
                      <ThemedText type="defaultSemiBold" style={styles.actionChipText} numberOfLines={1}>
                        {roleLabel}
                      </ThemedText>
                      {canPickRole ? (
                        <IconSymbol name="chevron.up.chevron.down" size={11} color={colors.icon} />
                      ) : null}
                    </TouchableOpacity>
                    {showRevoke ? (
                      <TouchableOpacity
                        style={[
                          styles.actionChip,
                          { backgroundColor: colors.error + '12', borderColor: colors.error + '30' },
                        ]}
                        onPress={() => confirmRevoke(inv.id, estate?.name ?? inv.estateId)}
                        activeOpacity={0.75}
                      >
                        <ThemedText type="defaultSemiBold" style={[styles.actionChipText, { color: colors.error }]}>
                          {t('guestsList.revokeCta')}
                        </ThemedText>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
            </GroupedList>
          )}
        </View>

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
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: colors.error }]}
            onPress={confirmRemoveAll}
            activeOpacity={0.7}
          >
            <IconSymbol name="trash" size={16} color={colors.error} />
            <ThemedText style={{ color: colors.error, fontWeight: '600' }}>
              {t('guestsList.removeGuest')}
            </ThemedText>
          </TouchableOpacity>
        )}
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  form: { paddingTop: 8 },
  field: { gap: 6 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700' },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 18 },
  profileEmail: { fontSize: 13 },
  noAccess: { fontSize: 14 },
  accessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  accessIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessName: { flex: 1, minWidth: 0, fontSize: 16 },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 84,
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionChipText: { fontSize: 12 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
});
