import { useMemo } from 'react';
import { Alert, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AddOfflineGuest } from '@/components/guests/add-offline-guest';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  GroupedList,
  GroupedRow,
  SectionLabel,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { EstateColors } from '@/constants/theme';
import { resolveGuestCalendarColor } from '@/lib/guest-calendar-color';
import { useManagedEstates } from '@/lib/entitlements/capabilities';
import { buildMessengerInviteShareMessage } from '@/lib/invite-messages';
import { pendingInviteRecipient } from '@/lib/pending-invite-recipient';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useGuestProfileStore } from '@/store/guest-profile-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { normalizeInviteRole, type Invitation } from '@/types';

type GuestListProps = {
  /** Scope to a single property; omit for every property the actor manages. */
  estateId?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
};

/**
 * Guests and pending invites, either for one property or across every property the
 * actor manages. Roles resolve through `useManagedEstates()` so invited hosts see
 * the properties they co-manage, and §3.1 host-invite actions stay sponsor-only.
 */
export function GuestList({ estateId, emptyActionLabel, onEmptyAction }: GuestListProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const allInvitations = useInvitationStore((s) => s.invitations);
  const revokeInvitation = useInvitationStore((s) => s.revokeInvitation);
  const deleteInvitation = useInvitationStore((s) => s.deleteInvitation);
  const guestProfiles = useGuestProfileStore((s) => s.profiles);
  const allEstates = useEstateStore((s) => s.estates);
  const profileById = useProfileStore((s) => s.byId);
  const { estateIds, roleById } = useManagedEstates();

  const scopedInvitations = useMemo(() => {
    const scope = new Set(estateId ? [estateId] : estateIds);
    return allInvitations.filter((inv) => scope.has(inv.estateId) && inv.status !== 'revoked');
  }, [allInvitations, estateId, estateIds]);

  const accepted = useMemo(
    () => scopedInvitations.filter((inv) => inv.status === 'accepted'),
    [scopedInvitations]
  );
  const pending = useMemo(
    () => scopedInvitations.filter((inv) => inv.status === 'pending'),
    [scopedInvitations]
  );
  const other = useMemo(
    () => scopedInvitations.filter((inv) => inv.status !== 'accepted' && inv.status !== 'pending'),
    [scopedInvitations]
  );
  const offline = useMemo(() => {
    const scope = new Set(estateId ? [estateId] : estateIds);
    return guestProfiles
      .filter((p) => scope.has(p.estateId))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [guestProfiles, estateId, estateIds]);

  /** Grouped by person for the cross-property view. */
  const acceptedByGuest = useMemo(() => {
    const map: Record<string, Invitation[]> = {};
    accepted.forEach((inv) => {
      if (!inv.guestId) return;
      (map[inv.guestId] ??= []).push(inv);
    });
    return Object.entries(map);
  }, [accepted]);

  const estateColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    allEstates.forEach((e, i) => {
      map[e.id] = EstateColors[i % EstateColors.length];
    });
    return map;
  }, [allEstates]);

  const estateName = (id: string): string =>
    allEstates.find((e) => e.id === id)?.name ?? t('common.unknownEstate');

  const roleLabel = (role?: string): string =>
    normalizeInviteRole(role ?? 'guest') === 'owner'
      ? t('ownerInvite.estateRoleCoOwnerLabel')
      : t('ownerInvite.estateRoleGuestLabel');

  /** §3.1 reserves withdrawing and revoking host access to the sponsor. */
  const canManageInvite = (inv: Invitation): boolean =>
    normalizeInviteRole(inv.role ?? 'guest') !== 'owner' || roleById[inv.estateId] === 'sponsor';

  const emailHintFor = (guestId: string): string | undefined =>
    allInvitations.find((inv) => inv.guestId === guestId && inv.guestEmail)?.guestEmail;

  function guestLabel(inv: Invitation): string {
    if (inv.guestId) return resolveUserDisplayName(inv.guestId, profileById, inv.guestEmail);
    return inv.guestEmail ?? inv.inviteCode;
  }

  function confirmRevoke(inv: Invitation, label: string) {
    Alert.alert(
      t('guestsList.revokeTitle'),
      t('guestsList.revokeBody', { name: label, property: estateName(inv.estateId) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('guestsList.revokeCta'),
          style: 'destructive',
          onPress: () => void revokeInvitation(inv.id),
        },
      ]
    );
  }

  function confirmDelete(inv: Invitation) {
    Alert.alert(t('guestsList.deleteInviteTitle'), t('guestsList.deleteInviteBody', { code: inv.inviteCode }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('editEstateScreen.deleteConfirmCta'),
        style: 'destructive',
        onPress: () => {
          void deleteInvitation(inv.id).then(({ error }) => {
            if (error) Alert.alert(t('guestsList.deleteInviteFailed'), error);
          });
        },
      },
    ]);
  }

  function shareInvite(inv: Invitation) {
    void Share.share({
      message: buildMessengerInviteShareMessage(
        [
          {
            estateName: estateName(inv.estateId),
            inviteCode: inv.inviteCode,
            role: normalizeInviteRole(inv.role ?? 'guest'),
          },
        ],
        { note: inv.message, openInviteSuffix: t('ownerInvite.openInviteSuffix') }
      ),
    });
  }

  function propertyPill(id: string, role?: string) {
    const dotColor = estateColorMap[id] ?? colors.tint;
    const isOwner = normalizeInviteRole(role ?? 'guest') === 'owner';
    return (
      <View
        key={id}
        style={[styles.accessPill, { backgroundColor: dotColor + '18', borderColor: dotColor + '44' }]}
      >
        <View style={[styles.pillDot, { backgroundColor: dotColor }]} />
        <ThemedText style={[styles.pillText, { color: dotColor }]}>
          {estateName(id)}
          {isOwner ? ` · ${roleLabel(role)}` : ''}
        </ThemedText>
      </View>
    );
  }

  if (accepted.length === 0 && pending.length === 0 && other.length === 0 && offline.length === 0) {
    return (
      <>
        <EmptyState
          icon="person.2.fill"
          title={t('guestsList.emptyTitle')}
          subtitle={estateId ? t('guestsList.emptySubProperty') : t('guestsList.emptySub')}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
        />
        {estateId != null ? <AddOfflineGuest estateId={estateId} /> : null}
      </>
    );
  }

  return (
    <>
      {estateId == null && acceptedByGuest.length > 0 && (
        <>
          <SectionLabel>
            {t('guestsList.guestCount', { count: acceptedByGuest.length })}
          </SectionLabel>
          <GroupedList>
            {acceptedByGuest.map(([guestId, invites], i) => {
              const emailHint = emailHintFor(guestId);
              const guestColor = resolveGuestCalendarColor(guestId, allInvitations);
              return (
                <GroupedRow
                  key={guestId}
                  icon="person.fill"
                  iconColor={guestColor}
                  iconBackgroundColor={guestColor + '20'}
                  title={resolveUserDisplayName(guestId, profileById, emailHint)}
                  subtitle={
                    <>
                      {emailHint ? (
                        <ThemedText style={[styles.guestEmail, { color: colors.textSecondary }]}>
                          {emailHint}
                        </ThemedText>
                      ) : null}
                      <View style={styles.accessPills}>
                        {invites.map((inv) => propertyPill(inv.estateId, inv.role))}
                      </View>
                    </>
                  }
                  trailing={<IconSymbol name="chevron.right" size={16} color={colors.icon} />}
                  onPress={() => router.push(`/(app)/guests/${guestId}` as never)}
                  isLast={i === acceptedByGuest.length - 1}
                />
              );
            })}
          </GroupedList>
        </>
      )}

      {estateId != null && accepted.length > 0 && (
        <>
          <SectionLabel>{t('guestsList.guestCount', { count: accepted.length })}</SectionLabel>
          <GroupedList>
            {accepted.map((inv, i) => {
              const label = guestLabel(inv);
              const guestColor = resolveGuestCalendarColor(inv.guestId, allInvitations, inv.estateId);
              return (
                <GroupedRow
                  key={inv.id}
                  icon="person.fill"
                  iconColor={guestColor}
                  iconBackgroundColor={guestColor + '20'}
                  title={label}
                  subtitle={
                    <View style={styles.accessPills}>
                      <Badge label={roleLabel(inv.role)} variant={'accepted' as never} />
                    </View>
                  }
                  trailing={
                    canManageInvite(inv) ? (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.error + '15' }]}
                        onPress={() => confirmRevoke(inv, label)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <ThemedText style={[styles.revokeText, { color: colors.error }]}>
                          {t('guestsList.revokeCta')}
                        </ThemedText>
                      </TouchableOpacity>
                    ) : undefined
                  }
                  onPress={
                    inv.guestId
                      ? () => router.push(`/(app)/guests/${inv.guestId}` as never)
                      : undefined
                  }
                  isLast={i === accepted.length - 1}
                />
              );
            })}
          </GroupedList>
        </>
      )}

      {(offline.length > 0 || estateId != null) && (
        <>
          {offline.length > 0 ? (
            <>
              <SectionLabel
                marginTop={
                  (estateId == null && acceptedByGuest.length > 0) ||
                  (estateId != null && accepted.length > 0)
                    ? 16
                    : 0
                }
              >
                {t('guestsList.offlineCount', { count: offline.length })}
              </SectionLabel>
              <GroupedList>
                {offline.map((p, i) => {
                  const guestColor = p.calendarColor ?? resolveGuestCalendarColor(p.id, []);
                  return (
                    <GroupedRow
                      key={p.id}
                      icon="person.fill"
                      iconColor={guestColor}
                      iconBackgroundColor={guestColor + '20'}
                      title={p.name}
                      subtitle={
                        estateId == null
                          ? `${estateName(p.estateId)} · ${t('guestsList.offlineBadge')}`
                          : t('guestsList.offlineBadge')
                      }
                      trailing={<IconSymbol name="chevron.right" size={16} color={colors.icon} />}
                      onPress={() => router.push(`/(app)/guests/offline/${p.id}` as never)}
                      isLast={i === offline.length - 1}
                    />
                  );
                })}
              </GroupedList>
            </>
          ) : null}
          {estateId != null ? (
            <View style={offline.length > 0 ? { marginTop: 8 } : undefined}>
              <AddOfflineGuest estateId={estateId} />
            </View>
          ) : null}
        </>
      )}

      {pending.length > 0 && (
        <>
          <SectionLabel marginTop={accepted.length > 0 || offline.length > 0 ? 16 : 0}>
            {t('guestsList.pendingCount', { count: pending.length })}
          </SectionLabel>
          <GroupedList>
            {pending.map((inv, i) => (
              <GroupedRow
                key={inv.id}
                icon="key.fill"
                title={pendingInviteRecipient(inv) ?? t('ownerInvite.inviteeUnset')}
                subtitle={
                  <>
                    <ThemedText style={[styles.code, { color: colors.textSecondary }]}>
                      {inv.inviteCode}
                    </ThemedText>
                    <View style={styles.accessPills}>{propertyPill(inv.estateId, inv.role)}</View>
                  </>
                }
                trailing={
                  <View style={styles.rowActions}>
                    <TouchableOpacity
                      style={[styles.iconBtn, { backgroundColor: colors.tint + '15' }]}
                      onPress={() => shareInvite(inv)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel={t('ownerInvite.shareTitle')}
                    >
                      <IconSymbol name="square.and.arrow.up" size={15} color={colors.tint} />
                    </TouchableOpacity>
                    {canManageInvite(inv) && (
                      <TouchableOpacity
                        style={[styles.iconBtn, { backgroundColor: colors.error + '15' }]}
                        onPress={() => confirmDelete(inv)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={t('guestsList.deleteInviteTitle')}
                      >
                        <IconSymbol name="trash" size={15} color={colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                }
                isLast={i === pending.length - 1}
              />
            ))}
          </GroupedList>
        </>
      )}

      {other.length > 0 && (
        <>
          <SectionLabel marginTop={accepted.length > 0 || pending.length > 0 ? 16 : 0}>
            {t('guestsList.otherSection')}
          </SectionLabel>
          <GroupedList>
            {other.map((inv, i) => (
              <GroupedRow
                key={inv.id}
                title={guestLabel(inv)}
                subtitle={estateId == null ? estateName(inv.estateId) : undefined}
                trailing={
                  <View style={styles.rowActions}>
                    <Badge label={inv.status} variant={inv.status as never} />
                    <TouchableOpacity
                      style={[styles.iconBtn, { backgroundColor: colors.error + '15' }]}
                      onPress={() => confirmDelete(inv)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel={t('guestsList.deleteInviteTitle')}
                    >
                      <IconSymbol name="trash" size={15} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                }
                isLast={i === other.length - 1}
              />
            ))}
          </GroupedList>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  guestEmail: { fontSize: 12 },
  code: { fontSize: 15, fontFamily: 'monospace', letterSpacing: 1 },
  accessPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  accessPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: '600' },
  rowActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  revokeText: { fontSize: 12, fontWeight: '700' },
});
