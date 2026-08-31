import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GroupedList, GroupedRow, useScreenTheme } from '@/components/ui/screen-layout';
import { formatDateRange } from '@/lib/date-utils';
import { useManagedEstates } from '@/lib/entitlements/capabilities';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { useStayStore } from '@/store/stay-store';
import type { StayRequest } from '@/types';

export type StayRequestStatusFilter = 'pending' | 'all';

/**
 * Requests arriving at properties the actor manages (spec §3: sponsor *or* invited
 * host), scoped to one property when `estateId` is given.
 */
export function useIncomingStayRequests(
  estateId?: string,
  statusFilter: StayRequestStatusFilter = 'pending'
): StayRequest[] {
  const stayRequests = useStayStore((s) => s.stayRequests);
  const { estateIds } = useManagedEstates();
  return useMemo(() => {
    const scope = estateId ? [estateId] : estateIds;
    return stayRequests
      .filter((r) => scope.includes(r.estateId))
      .filter((r) => statusFilter === 'all' || r.status === 'pending')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [stayRequests, estateId, estateIds, statusFilter]);
}

/** Requests the actor sent as a guest, newest first. */
export function useOutgoingStayRequests(estateId?: string): StayRequest[] {
  const stayRequests = useStayStore((s) => s.stayRequests);
  const currentUserId = useAuthStore((s) => s.currentUser?.id);
  return useMemo(
    () =>
      stayRequests
        .filter((r) => r.guestId === currentUserId)
        .filter((r) => !estateId || r.estateId === estateId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [stayRequests, currentUserId, estateId]
  );
}

type StayRequestsListProps = {
  /** Scope to a single property; omit for every property in scope for the role. */
  estateId?: string;
  /** `incoming` = requests to approve, `outgoing` = the actor's own requests. */
  mode?: 'incoming' | 'outgoing';
  statusFilter?: StayRequestStatusFilter;
  /** Defaults to true when unscoped, so rows say which property they belong to. */
  showEstateName?: boolean;
  emptyIcon?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  /** Render nothing instead of an empty state (for stacked sections). */
  hideWhenEmpty?: boolean;
};

export function StayRequestsList({
  estateId,
  mode = 'incoming',
  statusFilter = 'pending',
  showEstateName,
  emptyIcon = 'tray.fill',
  emptyTitle,
  emptySubtitle,
  emptyActionLabel,
  onEmptyAction,
  hideWhenEmpty = false,
}: StayRequestsListProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const allEstates = useEstateStore((s) => s.estates);
  const invitations = useInvitationStore((s) => s.invitations);
  const profileById = useProfileStore((s) => s.byId);
  const hasConflict = useStayStore((s) => s.hasConflict);

  const incoming = useIncomingStayRequests(estateId, statusFilter);
  const outgoing = useOutgoingStayRequests(estateId);
  const requests = mode === 'incoming' ? incoming : outgoing;
  const withEstateName = showEstateName ?? !estateId;

  const estateName = (id: string): string =>
    allEstates.find((e) => e.id === id)?.name ?? t('common.unknownEstate');

  const renderIncoming = (req: StayRequest, isLast: boolean) => {
    const emailHint = invitations.find(
      (inv) => inv.guestId === req.guestId && inv.guestEmail
    )?.guestEmail;
    const guestName = resolveUserDisplayName(req.guestId, profileById, emailHint);
    const conflict =
      req.status === 'pending' &&
      hasConflict(req.estateId, req.requestedFrom, req.requestedTo, req.id);

    return (
      <GroupedRow
        key={req.id}
        icon="person.fill"
        title={guestName}
        subtitle={
          <>
            {withEstateName ? (
              <ThemedText style={[styles.estate, { color: colors.tint }]}>
                {estateName(req.estateId)}
              </ThemedText>
            ) : null}
            <ThemedText style={[styles.dates, { color: colors.textSecondary }]}>
              {formatDateRange(req.requestedFrom, req.requestedTo)}
            </ThemedText>
            {conflict ? (
              <View style={styles.conflictBadge}>
                <IconSymbol name="exclamationmark.triangle.fill" size={12} color={colors.warning} />
                <ThemedText style={[styles.conflictText, { color: colors.warning }]}>
                  {t('stayRequestsList.dateConflict')}
                </ThemedText>
              </View>
            ) : null}
          </>
        }
        trailing={
          <View style={styles.right}>
            <StatusBadge status={req.status} />
            <IconSymbol name="chevron.right" size={16} color={colors.icon} />
          </View>
        }
        onPress={() => router.push(`/(app)/estates/${req.estateId}/stays/${req.id}` as never)}
        isLast={isLast}
      />
    );
  };

  const renderOutgoing = (req: StayRequest, isLast: boolean) => {
    const editable = req.status === 'pending' || req.status === 'approved';
    return (
      <GroupedRow
        key={req.id}
        icon="tray.fill"
        title={
          <View style={styles.rowTop}>
            <ThemedText type="defaultSemiBold" style={styles.rowTitle}>
              {estateName(req.estateId)}
            </ThemedText>
            <StatusBadge status={req.status} />
          </View>
        }
        subtitle={
          <>
            <ThemedText style={[styles.dates, { color: colors.textSecondary }]}>
              {formatDateRange(req.requestedFrom, req.requestedTo)}
            </ThemedText>
            {req.ownerNote ? (
              <ThemedText
                style={[styles.dates, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {t('guestStays.ownerNoteLabel')}: {req.ownerNote}
              </ThemedText>
            ) : null}
          </>
        }
        trailing={
          editable ? <IconSymbol name="chevron.right" size={14} color={colors.tint} /> : undefined
        }
        onPress={
          editable
            ? () => router.push(`/(app)/stays/edit?requestId=${req.id}` as never)
            : undefined
        }
        isLast={isLast}
      />
    );
  };

  if (requests.length === 0) {
    if (hideWhenEmpty) return null;
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle ?? t('stayRequestsList.emptyPendingTitle')}
        subtitle={emptySubtitle}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <GroupedList>
      {requests.map((req, i) =>
        mode === 'incoming'
          ? renderIncoming(req, i === requests.length - 1)
          : renderOutgoing(req, i === requests.length - 1)
      )}
    </GroupedList>
  );
}

const styles = StyleSheet.create({
  estate: { fontSize: 12, fontWeight: '600' },
  dates: { fontSize: 13 },
  right: { alignItems: 'flex-end', gap: 6 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rowTitle: { fontSize: 14 },
  conflictBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  conflictText: { fontSize: 11, fontWeight: '600' },
});
