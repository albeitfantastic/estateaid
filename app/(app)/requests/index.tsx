import { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/useAppTheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useStayStore } from '@/store/stay-store';
import { formatDateRange } from '@/lib/date-utils';

export default function RequestsInbox() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const appTheme = useAppTheme();
  const colors = appTheme.colors;
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const estates = useMemo(
    () => allEstates.filter((e) => e.ownerId === (currentUser?.id ?? '')),
    [allEstates, currentUser?.id]
  );
  const estateIds = useMemo(() => estates.map((e) => e.id), [estates]);
  const stayRequests = useStayStore((s) => s.stayRequests);
  const profileById = useProfileStore((s) => s.byId);
  const invitations = useInvitationStore((s) => s.invitations);
  const allRequests = useMemo(
    () =>
      stayRequests
        .filter((r) => estateIds.includes(r.estateId) && r.status === 'pending')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [stayRequests, estateIds]
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      
        <ThemedText type="title" style={styles.title}>{t('titles.inbox')}</ThemedText>
        {allRequests.length > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <ThemedText style={styles.badgeText}>{allRequests.length}</ThemedText>
          </View>
        )}
      </View>

      {allRequests.length === 0 ? (
        <EmptyState
          icon="tray.fill"
          title="All caught up"
          subtitle="No pending stay requests across your estates."
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}>
          {allRequests.map((req) => {
            const estate = estates.find((e) => e.id === req.estateId);
            const emailHint = invitations.find(
              (i) => i.guestId === req.guestId && i.guestEmail
            )?.guestEmail;
            const guestName = resolveUserDisplayName(req.guestId, profileById, emailHint);
            return (
              <TouchableOpacity
                key={req.id}
                style={[
                  styles.row,
                  { borderColor: colors.border, backgroundColor: colors.card },
                  appTheme.shadows.sm,
                ]}
                onPress={() => router.push(`/(app)/estates/${req.estateId}/stays/${req.id}` as never)}
                activeOpacity={0.8}
              >
                <Avatar name={guestName} size={44} color={colors.primary} />
                <View style={styles.info}>
                  <ThemedText type="defaultSemiBold">{guestName}</ThemedText>
                  <ThemedText style={[styles.estate, { color: colors.primary }]}>{estate?.name}</ThemedText>
                  <ThemedText style={[styles.dates, { color: colors.textMuted }]}>
                    {formatDateRange(req.requestedFrom, req.requestedTo)}
                  </ThemedText>
                </View>
                <View style={styles.right}>
                  <StatusBadge status={req.status} />
                  <IconSymbol name="chevron.right" size={16} color={colors.icon} />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.section - 4,
    gap: 10,
  },
  title: { flex: 1, fontSize: 28, fontWeight: '700' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.md },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  list: { paddingHorizontal: spacing.screen },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    gap: 12,
  },
  info: { flex: 1, gap: 2 },
  estate: { fontSize: 12, fontWeight: '600' },
  dates: { fontSize: 13 },
  right: { alignItems: 'flex-end', gap: 6 },
  back: { padding: 4 },
});
