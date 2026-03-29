import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { StatusBadge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { useStayStore } from '@/store/stay-store';
import { formatDateRange, nightCount } from '@/lib/date-utils';

export default function AdminViewStayRequest() {
  const { estateId, requestId } = useLocalSearchParams<{ estateId: string; requestId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { stayRequests, hasConflict } = useStayStore();
  const profileById = useProfileStore((s) => s.byId);

  const req = stayRequests.find((r) => r.id === requestId);
  const guestName = req ? resolveUserDisplayName(req.guestId, profileById) : '';

  if (!req) {
    return (
      <ThemedView style={styles.center}><ThemedText>Request not found.</ThemedText></ThemedView>
    );
  }

  const conflict = hasConflict(estateId, req.requestedFrom, req.requestedTo, requestId);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>Stay Request</ThemedText>
      </View>

      <View style={[styles.readonlyBanner, { backgroundColor: colors.icon + '12', borderColor: colors.icon + '25' }]}>
        <IconSymbol name="eye.fill" size={13} color={colors.icon} />
        <ThemedText style={[styles.readonlyText, { color: colors.icon }]}>View only — only the owner can approve or decline</ThemedText>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>
        <View style={[styles.guestCard, { borderColor: colors.icon + '22', backgroundColor: colors.background }]}>
          <Avatar name={guestName} size={48} color={colors.tint} />
          <View style={styles.guestInfo}>
            <ThemedText type="defaultSemiBold" style={styles.guestName}>{guestName}</ThemedText>
          </View>
          <StatusBadge status={req.status} />
        </View>

        <View style={[styles.section, { borderColor: colors.icon + '22' }]}>
          <ThemedText style={[styles.sectionLabel, { color: colors.icon }]}>Requested Dates</ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.datesText}>
            {formatDateRange(req.requestedFrom, req.requestedTo)}
          </ThemedText>
          <ThemedText style={[styles.nights, { color: colors.icon }]}>
            {nightCount(req.requestedFrom, req.requestedTo)} nights
          </ThemedText>
          {conflict && (
            <View style={[styles.conflictAlert, { backgroundColor: '#f59e0b18', borderColor: '#f59e0b55' }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={14} color="#f59e0b" />
              <ThemedText style={styles.conflictText}>
                These dates conflict with an existing approved stay.
              </ThemedText>
            </View>
          )}
        </View>

        {req.guestNote && (
          <View style={[styles.section, { borderColor: colors.icon + '22' }]}>
            <ThemedText style={[styles.sectionLabel, { color: colors.icon }]}>Guest's Note</ThemedText>
            <ThemedText style={{ lineHeight: 20 }}>{req.guestNote}</ThemedText>
          </View>
        )}

        {req.ownerNote && (
          <View style={[styles.section, { borderColor: colors.icon + '22' }]}>
            <ThemedText style={[styles.sectionLabel, { color: colors.icon }]}>Owner's Note</ThemedText>
            <ThemedText style={{ lineHeight: 20 }}>{req.ownerNote}</ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 24, fontWeight: '700' },
  readonlyBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 20, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  readonlyText: { fontSize: 12 },
  scroll: { paddingHorizontal: 20, gap: 16 },
  guestCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  guestInfo: { flex: 1, gap: 2 },
  guestName: { fontSize: 16 },
  section: { padding: 14, borderRadius: 14, borderWidth: 1, gap: 4 },
  sectionLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  datesText: { fontSize: 16 },
  nights: { fontSize: 13 },
  conflictAlert: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8, borderWidth: 1, marginTop: 6 },
  conflictText: { flex: 1, fontSize: 12, color: '#f59e0b', fontWeight: '500' },
});
