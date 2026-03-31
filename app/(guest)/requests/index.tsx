import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StatusBadge } from '@/components/ui/badge';
import { Colors, EstateColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDateRange } from '@/lib/date-utils';
import { guestEmailsMatch } from '@/lib/invite-email';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useStayStore } from '@/store/stay-store';

export default function GuestRequests() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const allInvitations = useInvitationStore((s) => s.invitations);
  const stayRequests = useStayStore((s) => s.stayRequests);

  const acceptedEstates = useMemo(() => {
    const ids = allInvitations
      .filter((inv) => inv.guestEmail === currentUser?.email && inv.status === 'accepted')
      .map((inv) => inv.estateId);
    return allEstates.filter((e) => ids.includes(e.id));
  }, [allInvitations, allEstates, currentUser?.email, currentUser?.id]);

  const estateColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    acceptedEstates.forEach((e, i) => { map[e.id] = EstateColors[i % EstateColors.length]; });
    return map;
  }, [acceptedEstates]);

  const myRequests = useMemo(
    () =>
      stayRequests
        .filter((r) => r.guestId === currentUser?.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [stayRequests, currentUser?.id]
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>My Requests</ThemedText>
        {myRequests.length > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.tint }]}>
            <ThemedText style={styles.badgeText}>{myRequests.filter((r) => r.status === 'pending').length}</ThemedText>
          </View>
        )}
      </View>

      {myRequests.length === 0 ? (
        <EmptyState
          icon="tray.fill"
          title="No stay requests"
          subtitle="When you request a stay at an estate, it will appear here."
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}>
          {myRequests.map((req) => {
            const estate = acceptedEstates.find((e) => e.id === req.estateId);
            const dotColor = estateColorMap[req.estateId] ?? colors.tint;
            return (
              <View
                key={req.id}
                style={[styles.row, { borderColor: colors.icon + '22', backgroundColor: colors.background }]}
              >
                <View style={[styles.colorBar, { backgroundColor: dotColor }]} />
                <View style={styles.info}>
                  <View style={styles.rowTop}>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="defaultSemiBold">{estate?.name ?? 'Unknown Estate'}</ThemedText>
                      <ThemedText style={[styles.dates, { color: colors.icon }]}>
                        {formatDateRange(req.requestedFrom, req.requestedTo)}
                      </ThemedText>
                    </View>
                    <StatusBadge status={req.status} />
                  </View>
                  {req.guestNote ? (
                    <ThemedText style={[styles.note, { color: colors.icon }]} numberOfLines={2}>
                      {req.guestNote}
                    </ThemedText>
                  ) : null}
                  {req.ownerNote ? (
                    <View style={[styles.ownerNote, { backgroundColor: colors.tint + '08' }]}>
                      <ThemedText style={[styles.ownerNoteLabel, { color: colors.tint }]}>Owner response</ThemedText>
                      <ThemedText style={[styles.note, { color: colors.text }]}>{req.ownerNote}</ThemedText>
                    </View>
                  ) : null}
                  {req.status === 'alternative_proposed' && req.alternativeFrom && req.alternativeTo && (
                    <ThemedText style={[styles.altDates, { color: colors.tint }]}>
                      Proposed: {formatDateRange(req.alternativeFrom, req.alternativeTo)}
                    </ThemedText>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 22, fontWeight: '700' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  list: { paddingHorizontal: 20 },
  row: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  colorBar: { width: 4, alignSelf: 'stretch' },
  info: { flex: 1, padding: 14, gap: 6 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dates: { fontSize: 13, marginTop: 2 },
  note: { fontSize: 13, lineHeight: 18 },
  ownerNote: { padding: 10, borderRadius: 10, gap: 4 },
  ownerNoteLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  altDates: { fontSize: 13, fontWeight: '600' },
});
