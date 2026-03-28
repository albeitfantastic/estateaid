import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useStayStore } from '@/store/stay-store';
import { formatDateRange } from '@/lib/date-utils';

export default function MyStays() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const { getRequestsByGuest, cancelRequest, acceptAlternative, declineAlternative } = useStayStore();
  const requests = getRequestsByGuest(currentUser?.id ?? '').filter((r) => r.estateId === estateId);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>My Stay Requests</ThemedText>
      </View>

      {requests.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="No requests yet"
          subtitle="Request a stay to get started."
          actionLabel="Request a Stay"
          onAction={() => router.push(`/(guest)/estates/${estateId}/request-stay` as never)}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}>
          {requests.map((req) => (
            <View key={req.id} style={[styles.card, { borderColor: colors.icon + '22', backgroundColor: colors.background }]}>
              <View style={styles.top}>
                <View style={styles.dates}>
                  <ThemedText type="defaultSemiBold">{formatDateRange(req.requestedFrom, req.requestedTo)}</ThemedText>
                </View>
                <StatusBadge status={req.status} />
              </View>

              {req.guestNote && (
                <ThemedText style={[styles.note, { color: colors.icon }]}>Your note: {req.guestNote}</ThemedText>
              )}
              {req.ownerNote && (
                <ThemedText style={[styles.ownerNote, { backgroundColor: colors.tint + '11', color: colors.text }]}>
                  Owner: {req.ownerNote}
                </ThemedText>
              )}

              {req.status === 'alternative_proposed' && req.alternativeFrom && req.alternativeTo && (
                <View style={styles.altSection}>
                  <ThemedText style={[styles.altLabel, { color: colors.tint }]}>Proposed alternative:</ThemedText>
                  <ThemedText type="defaultSemiBold">{formatDateRange(req.alternativeFrom, req.alternativeTo)}</ThemedText>
                  <View style={styles.altActions}>
                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: colors.tint }]}
                      onPress={() => {
                        const result = acceptAlternative(req.id);
                        if (!result.success) Alert.alert('Conflict', 'These dates are no longer available.');
                      }}
                    >
                      <ThemedText style={styles.btnText}>Accept</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btn, { borderColor: colors.icon + '44', borderWidth: 1 }]}
                      onPress={() => declineAlternative(req.id)}
                    >
                      <ThemedText style={[styles.btnText, { color: colors.icon }]}>Decline</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {req.status === 'pending' && (
                <TouchableOpacity
                  style={styles.cancelLink}
                  onPress={() => Alert.alert('Cancel Request', 'Cancel this stay request?', [
                    { text: 'Keep', style: 'cancel' },
                    { text: 'Cancel Request', style: 'destructive', onPress: () => cancelRequest(req.id) },
                  ])}
                >
                  <ThemedText style={{ color: colors.icon, fontSize: 13 }}>Cancel request</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 24, fontWeight: '700' },
  list: { paddingHorizontal: 20, gap: 12 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dates: { flex: 1 },
  note: { fontSize: 13 },
  ownerNote: { fontSize: 13, padding: 10, borderRadius: 8, lineHeight: 18 },
  altSection: { gap: 4, marginTop: 4 },
  altLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  altActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  cancelLink: { alignSelf: 'flex-start', marginTop: 4 },
});
