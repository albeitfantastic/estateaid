import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDate } from '@/lib/date-utils';
import { useActivityLogStore } from '@/store/activity-log-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import type { EstateActivityAction } from '@/types';

const ACTION_LABELS: Record<EstateActivityAction, string> = {
  estate_created: 'created this property',
  estate_updated: 'updated this property',
  invitation_sent: 'sent an invitation',
  invitation_accepted: 'accepted an invitation',
  invitation_declined: 'declined an invitation',
  invitation_revoked: 'revoked an invitation',
  stay_request_approved: 'approved a stay request',
  stay_request_declined: 'declined a stay request',
  stay_request_alternative_proposed: 'proposed alternative dates',
  stay_request_cancelled: 'cancelled a stay request',
};

export default function ActivityLogScreen() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { getEntriesByEstate, fetchFromSupabase } = useActivityLogStore();
  const profileById = useProfileStore((s) => s.byId);
  const entries = getEntriesByEstate(estateId);

  useFocusEffect(
    useCallback(() => {
      void fetchFromSupabase();
    }, [fetchFromSupabase])
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>Activity</ThemedText>
      </View>

      {entries.length === 0 ? (
        <EmptyState
          icon="clock.fill"
          title="No activity yet"
          subtitle="Actions on this property will show up here."
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}>
          {entries.map((entry) => {
            const actorName = resolveUserDisplayName(entry.actorId, profileById);
            const dateLabel = entry.createdAt.length >= 10 ? formatDate(entry.createdAt.slice(0, 10)) : '';
            return (
              <View
                key={entry.id}
                style={[styles.row, { borderColor: colors.icon + '22', backgroundColor: colors.background }]}
              >
                <ThemedText style={styles.line}>
                  <ThemedText type="defaultSemiBold">{actorName}</ThemedText>{' '}
                  {ACTION_LABELS[entry.action]}
                </ThemedText>
                <ThemedText style={[styles.date, { color: colors.icon }]}>{dateLabel}</ThemedText>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 28, fontWeight: '700' },
  list: { paddingHorizontal: 20, gap: 10 },
  row: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 4 },
  line: { fontSize: 14, lineHeight: 20 },
  date: { fontSize: 12 },
});
