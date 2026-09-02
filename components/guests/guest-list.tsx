import { useMemo, type ReactNode } from 'react';
import { Alert, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { RoleUsageBar } from '@/components/guests/role-usage-bar';
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
import { OWNER_INVITE_CAP } from '@/lib/entitlements/constants';
import { buildMessengerInviteShareMessage } from '@/lib/invite-messages';
import { pendingInviteRecipient } from '@/lib/pending-invite-recipient';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useGuestProfileStore } from '@/store/guest-profile-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { normalizeInviteRole, type Estate, type Invitation, guestProfileEstateIds } from '@/types';

type GuestListProps = {
  /** Scope to a single property; omit for every property the actor manages. */
  estateId?: string;
  /** Rendered under the role counters (Send Invite, add without app). */
  actions?: ReactNode;
};

function isOpenInvite(inv: Invitation): boolean {
  return inv.status === 'accepted' || inv.status === 'pending';
}

/** Invited hosts only (excludes sponsor). Pending host invites occupy a seat. */
function hostSeatsForEstate(estate: Estate, invitations: Invitation[]): number {
  const sponsorId = estate.sponsorUserId;
  const ownerId = estate.ownerId;
  let n = 0;
  if (ownerId && ownerId !== sponsorId) n += 1;
  for (const inv of invitations) {
    if (inv.estateId !== estate.id || !isOpenInvite(inv)) continue;
    if (normalizeInviteRole(inv.role) !== 'owner') continue;
    if (inv.guestId === sponsorId || inv.guestId === ownerId) continue;
    n += 1;
  }
  return n;
}

/**
 * Guests and pending invites, either for one property or across every property the
 * actor manages. Roles resolve through `useManagedEstates()` so invited hosts see
 * the properties they co-manage, and §3.1 host-invite actions stay sponsor-only.
 */
export function GuestList({ estateId, actions }: GuestListProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const allInvitations = useInvitationStore((s) => s.invitations);
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
      .filter((p) => guestProfileEstateIds(p).some((id) => scope.has(id)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [guestProfiles, estateId, estateIds]);

  const scopedEstates = useMemo(() => {
    const ids = new Set(estateId ? [estateId] : estateIds);
    return allEstates.filter((e) => ids.has(e.id));
  }, [allEstates, estateId, estateIds]);

  const sponsorsByUser = useMemo(() => {
    const map = new Map<string, Estate[]>();
    for (const e of scopedEstates) {
      if (!e.sponsorUserId) continue;
      const list = map.get(e.sponsorUserId);
      if (list) list.push(e);
      else map.set(e.sponsorUserId, [e]);
    }
    return [...map.entries()];
  }, [scopedEstates]);

  const sponsorIds = useMemo(
    () => new Set(sponsorsByUser.map(([id]) => id)),
    [sponsorsByUser]
  );

  const guestRoleCount = useMemo(() => {
    const guestInvites = scopedInvitations.filter(
      (inv) => isOpenInvite(inv) && normalizeInviteRole(inv.role) === 'guest'
    ).length;
    return guestInvites + offline.length;
  }, [scopedInvitations, offline.length]);

  const hostRoleCount = useMemo(() => {
    if (scopedEstates.length > 0) {
      return scopedEstates.reduce((sum, e) => sum + hostSeatsForEstate(e, scopedInvitations), 0);
    }
    return scopedInvitations.filter(
      (inv) => isOpenInvite(inv) && normalizeInviteRole(inv.role) === 'owner'
    ).length;
  }, [scopedEstates, scopedInvitations]);

  const propertyCount = estateId ? 1 : estateIds.length;
  const sponsorCount = Math.max(scopedEstates.length, propertyCount);
  const usageBar =
    propertyCount > 0 ? (
      <RoleUsageBar
        guestCount={guestRoleCount}
        hostUsed={hostRoleCount}
        hostTotal={OWNER_INVITE_CAP * Math.max(propertyCount, 1)}
        sponsorCount={sponsorCount}
      />
    ) : null;

  /** Grouped by person for the cross-property view. Sponsors are listed separately. */
  const acceptedByGuest = useMemo(() => {
    const map: Record<string, Invitation[]> = {};
    accepted.forEach((inv) => {
      if (!inv.guestId || sponsorIds.has(inv.guestId)) return;
      (map[inv.guestId] ??= []).push(inv);
    });
    return Object.entries(map);
  }, [accepted, sponsorIds]);

  const acceptedWithoutSponsors = useMemo(
    () => accepted.filter((inv) => !inv.guestId || !sponsorIds.has(inv.guestId)),
    [accepted, sponsorIds]
  );

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

  function nameWithTags(name: string, tags: ReactNode) {
    return (
      <View style={styles.titleRow}>
        <ThemedText type="defaultSemiBold" style={styles.titleText} numberOfLines={1}>
          {name}
        </ThemedText>
        {tags}
      </View>
    );
  }

  const rowChevron = <IconSymbol name="chevron.right" size={16} color={colors.icon} />;

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
    const isSponsor = role === 'sponsor';
    const isOwner = !isSponsor && normalizeInviteRole(role ?? 'guest') === 'owner';
    const extra = isSponsor
      ? ` · ${t('guestsList.roleSponsor')}`
      : isOwner
        ? ` · ${roleLabel(role)}`
        : '';
    return (
      <View
        key={`${id}-${role ?? 'guest'}`}
        style={[styles.accessPill, { backgroundColor: dotColor + '18', borderColor: dotColor + '44' }]}
      >
        <View style={[styles.pillDot, { backgroundColor: dotColor }]} />
        <ThemedText style={[styles.pillText, { color: dotColor }]}>
          {estateName(id)}
          {extra}
        </ThemedText>
      </View>
    );
  }

  function sponsorRow(sponsorId: string, estates: Estate[], isLast: boolean) {
    const emailHint = emailHintFor(sponsorId);
    const color = resolveGuestCalendarColor(sponsorId, allInvitations, estateId);
    const extraInvites = accepted.filter((inv) => inv.guestId === sponsorId);
    return (
      <GroupedRow
        key={`sponsor-${sponsorId}`}
        icon="person.fill"
        iconColor={color}
        iconBackgroundColor={color + '20'}
        title={nameWithTags(
          resolveUserDisplayName(sponsorId, profileById, emailHint),
          estateId != null ? (
            <Badge label={t('guestsList.roleSponsor')} variant={'accepted' as never} />
          ) : (
            <View style={styles.inlineTags}>
              {estates.map((e) => propertyPill(e.id, 'sponsor'))}
              {extraInvites.map((inv) => propertyPill(inv.estateId, inv.role))}
            </View>
          )
        )}
        subtitle={
          emailHint ? (
            <ThemedText style={[styles.guestEmail, { color: colors.textSecondary }]}>
              {emailHint}
            </ThemedText>
          ) : undefined
        }
        isLast={isLast}
      />
    );
  }

  if (
    sponsorsByUser.length === 0 &&
    accepted.length === 0 &&
    pending.length === 0 &&
    other.length === 0 &&
    offline.length === 0
  ) {
    return (
      <>
        {usageBar}
        {actions}
        <EmptyState
          icon="person.2.fill"
          title={t('guestsList.emptyTitle')}
          subtitle={estateId ? t('guestsList.emptySubProperty') : t('guestsList.emptySub')}
        />
      </>
    );
  }

  const peopleCount =
    sponsorsByUser.length +
    (estateId == null ? acceptedByGuest.length : acceptedWithoutSponsors.length) +
    offline.length;

  return (
    <>
      {usageBar}
      {actions}
      {estateId == null && peopleCount > 0 && (
        <GroupedList>
          {sponsorsByUser.map(([sponsorId, estates], i) =>
            sponsorRow(
              sponsorId,
              estates,
              i === sponsorsByUser.length - 1 && acceptedByGuest.length === 0 && offline.length === 0
            )
          )}
          {acceptedByGuest.map(([guestId, invites], i) => {
            const emailHint = emailHintFor(guestId);
            const guestColor = resolveGuestCalendarColor(guestId, allInvitations);
            return (
              <GroupedRow
                key={guestId}
                icon="person.fill"
                iconColor={guestColor}
                iconBackgroundColor={guestColor + '20'}
                title={nameWithTags(
                  resolveUserDisplayName(guestId, profileById, emailHint),
                  <View style={styles.inlineTags}>
                    {invites.map((inv) => propertyPill(inv.estateId, inv.role))}
                  </View>
                )}
                subtitle={
                  emailHint ? (
                    <ThemedText style={[styles.guestEmail, { color: colors.textSecondary }]}>
                      {emailHint}
                    </ThemedText>
                  ) : undefined
                }
                trailing={rowChevron}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/guests/[guestId]',
                    params: estateId ? { guestId, estateId } : { guestId },
                  } as never)
                }
                isLast={i === acceptedByGuest.length - 1 && offline.length === 0}
              />
            );
          })}
          {offline.map((p, i) => {
            const guestColor = p.calendarColor ?? resolveGuestCalendarColor(p.id, []);
            return (
              <GroupedRow
                key={p.id}
                icon="person.fill"
                iconColor={guestColor}
                iconBackgroundColor={guestColor + '20'}
                title={nameWithTags(
                  p.name,
                  <View style={styles.inlineTags}>
                    <Badge label={t('guestsList.offlineBadge')} variant="neutral" />
                    {guestProfileEstateIds(p).map((id) => propertyPill(id))}
                  </View>
                )}
                trailing={rowChevron}
                onPress={() => router.push(`/(app)/guests/offline/${p.id}` as never)}
                isLast={i === offline.length - 1}
              />
            );
          })}
        </GroupedList>
      )}

      {estateId != null && peopleCount > 0 && (
        <GroupedList>
          {sponsorsByUser.map(([sponsorId, estates], i) =>
            sponsorRow(
              sponsorId,
              estates,
              i === sponsorsByUser.length - 1 &&
                acceptedWithoutSponsors.length === 0 &&
                offline.length === 0
            )
          )}
          {acceptedWithoutSponsors.map((inv, i) => {
            const label = guestLabel(inv);
            const guestColor = resolveGuestCalendarColor(inv.guestId, allInvitations, inv.estateId);
            return (
              <GroupedRow
                key={inv.id}
                icon="person.fill"
                iconColor={guestColor}
                iconBackgroundColor={guestColor + '20'}
                title={nameWithTags(
                  label,
                  <Badge label={roleLabel(inv.role)} variant={'accepted' as never} />
                )}
                trailing={rowChevron}
                onPress={
                  inv.guestId
                    ? () =>
                        router.push({
                          pathname: '/(app)/guests/[guestId]',
                          params: estateId
                            ? { guestId: inv.guestId, estateId }
                            : { guestId: inv.guestId },
                        } as never)
                    : undefined
                }
                isLast={i === acceptedWithoutSponsors.length - 1 && offline.length === 0}
              />
            );
          })}
          {offline.map((p, i) => {
            const guestColor = p.calendarColor ?? resolveGuestCalendarColor(p.id, []);
            return (
              <GroupedRow
                key={p.id}
                icon="person.fill"
                iconColor={guestColor}
                iconBackgroundColor={guestColor + '20'}
                title={nameWithTags(
                  p.name,
                  <Badge label={t('guestsList.offlineBadge')} variant="neutral" />
                )}
                trailing={rowChevron}
                onPress={() =>
                  router.push(`/(app)/estates/${estateId}/guests/offline/${p.id}` as never)
                }
                isLast={i === offline.length - 1}
              />
            );
          })}
        </GroupedList>
      )}

      {pending.length > 0 && (
        <>
          <SectionLabel marginTop={peopleCount > 0 ? 24 : 0}>
            {t('guestsList.pendingCount', { count: pending.length })}
          </SectionLabel>
          <GroupedList>
            {pending.map((inv, i) => (
              <GroupedRow
                key={inv.id}
                icon="key.fill"
                title={nameWithTags(
                  pendingInviteRecipient(inv) ?? t('ownerInvite.inviteeUnset'),
                  <View style={styles.inlineTags}>{propertyPill(inv.estateId, inv.role)}</View>
                )}
                subtitle={
                  <ThemedText style={[styles.code, { color: colors.textSecondary }]}>
                    {inv.inviteCode}
                  </ThemedText>
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
          <SectionLabel marginTop={peopleCount > 0 || pending.length > 0 ? 24 : 0}>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  titleText: { fontSize: 16, flexShrink: 1 },
  inlineTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  guestEmail: { fontSize: 12 },
  code: { fontSize: 15, fontFamily: 'monospace', letterSpacing: 1 },
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
});
