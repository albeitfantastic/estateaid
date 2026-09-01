import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GroupedList, GroupedRow, useScreenTheme } from '@/components/ui/screen-layout';
import { EstateColors } from '@/constants/theme';
import { formatDateRange, today } from '@/lib/date-utils';
import { useManagedEstates } from '@/lib/entitlements/capabilities';
import { resolveStayOccupantColor, resolveStayOccupantName, stayIsSelf } from '@/lib/stay-occupant';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useGuestProfileStore } from '@/store/guest-profile-store';
import { useProfileStore } from '@/store/profile-store';
import { useStayStore } from '@/store/stay-store';
import type { Stay } from '@/types';

/** Confirmed stays on properties the actor manages (sponsor or invited host). */
export function useManagedStays(estateId?: string): Stay[] {
  const stays = useStayStore((s) => s.stays);
  const { estateIds } = useManagedEstates();
  const todayStr = today();
  return useMemo(() => {
    const scope = estateId ? [estateId] : estateIds;
    return stays
      .filter((s) => scope.includes(s.estateId) && s.to >= todayStr)
      .sort((a, b) => a.from.localeCompare(b.from));
  }, [stays, estateId, estateIds, todayStr]);
}

/** Confirmed stays booked for the actor themselves, wherever they are the guest. */
export function useMyStays(estateId?: string): Stay[] {
  const stays = useStayStore((s) => s.stays);
  const currentUserId = useAuthStore((s) => s.currentUser?.id);
  const todayStr = today();
  return useMemo(
    () =>
      stays
        .filter((s) => s.guestId === currentUserId && s.to >= todayStr)
        .filter((s) => !estateId || s.estateId === estateId)
        .sort((a, b) => a.from.localeCompare(b.from)),
    [stays, currentUserId, estateId, todayStr]
  );
}

type StaysListProps = {
  estateId?: string;
  /** `managed` = stays the actor administers, `mine` = the actor's own stays. */
  mode: 'managed' | 'mine';
  emptyIcon?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  hideWhenEmpty?: boolean;
};

export function StaysList({
  estateId,
  mode,
  emptyIcon = 'calendar',
  emptyTitle,
  emptySubtitle,
  emptyActionLabel,
  onEmptyAction,
  hideWhenEmpty = false,
}: StaysListProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const profileById = useProfileStore((s) => s.byId);
  const invitations = useInvitationStore((s) => s.invitations);
  const guestProfiles = useGuestProfileStore((s) => s.profiles);

  const managed = useManagedStays(estateId);
  const mine = useMyStays(estateId);
  const stays = mode === 'managed' ? managed : mine;

  const estateColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    allEstates.forEach((e, i) => {
      map[e.id] = EstateColors[i % EstateColors.length];
    });
    return map;
  }, [allEstates]);

  const estateName = (id: string): string =>
    allEstates.find((e) => e.id === id)?.name ?? t('common.unknownEstate');

  if (stays.length === 0) {
    if (hideWhenEmpty) return null;
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle ?? t('ownerHome.noUpcomingTitle')}
        subtitle={emptySubtitle}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <GroupedList>
      {stays.map((stay, i) => {
        const dotColor = estateColorMap[stay.estateId] ?? colors.tint;
        const isLast = i === stays.length - 1;

        if (mode === 'mine') {
          return (
            <GroupedRow
              key={stay.id}
              icon="building.2.fill"
              iconColor={dotColor}
              iconBackgroundColor={dotColor + '22'}
              title={estateName(stay.estateId)}
              subtitle={formatDateRange(stay.from, stay.to)}
              trailing={<IconSymbol name="chevron.right" size={14} color={colors.tint} />}
              onPress={() => router.push(`/(app)/stays/${stay.id}` as never)}
              isLast={isLast}
            />
          );
        }

        const isSelf = stayIsSelf(stay, currentUser?.id);
        const guestColor = isSelf
          ? colors.tint
          : resolveStayOccupantColor(stay, invitations, guestProfiles);
        const guestLabel = isSelf
          ? `${currentUser?.name?.split(' ')[0] ?? t('common.you')} ${t('ownerHome.youSuffix')}`
          : resolveStayOccupantName(stay, { profilesById: profileById, guestProfiles });

        return (
          <GroupedRow
            key={stay.id}
            icon="person.fill"
            iconColor={guestColor}
            iconBackgroundColor={guestColor + '22'}
            title={
              <View style={styles.rowTop}>
                <ThemedText type="defaultSemiBold" style={styles.guestName}>
                  {guestLabel}
                </ThemedText>
                {isSelf ? (
                  <View style={[styles.hostBadge, { backgroundColor: colors.tint + '18' }]}>
                    <ThemedText style={[styles.hostBadgeText, { color: colors.tint }]}>
                      {t('ownerInvite.estateRoleCoOwnerLabel')}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            }
            subtitle={`${estateName(stay.estateId)} · ${formatDateRange(stay.from, stay.to)}`}
            trailing={
              <TouchableOpacity
                style={[styles.editBtn, { backgroundColor: colors.tint + '15' }]}
                onPress={() => router.push(`/(app)/stays/${stay.id}` as never)}
                activeOpacity={0.75}
                accessibilityLabel={t('titles.editStay')}
              >
                <IconSymbol name="pencil" size={15} color={colors.tint} />
              </TouchableOpacity>
            }
            isLast={isLast}
          />
        );
      })}
    </GroupedList>
  );
}

const styles = StyleSheet.create({
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  guestName: { fontSize: 14 },
  hostBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  hostBadgeText: { fontSize: 10, fontWeight: '700' },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
});
