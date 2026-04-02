import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StatusBadge } from '@/components/ui/badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { useStayStore } from '@/store/stay-store';
import { formatDateRange } from '@/lib/date-utils';

const TABS = ['Pending', 'All'] as const;

export default function StayRequestsList() {
  const { t } = useTranslation();
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [tab, setTab] = useState<'Pending' | 'All'>('Pending');
  const profileById = useProfileStore((s) => s.byId);
  const { getRequestsByEstate, hasConflict } = useStayStore();
  const all = getRequestsByEstate(estateId);
  const requests = tab === 'Pending' ? all.filter((r) => r.status === 'pending') : all;

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>{t('titles.stayRequests')}</ThemedText>
      </View>

      <View style={[styles.tabs, { borderColor: colors.icon + '33' }]}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
            onPress={() => setTab(t)}
          >
            <ThemedText style={[styles.tabText, tab === t && { color: colors.tint }]}>{t}</ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {requests.length === 0 ? (
        <EmptyState icon="calendar" title={tab === 'Pending' ? 'No pending requests' : 'No requests yet'} />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}>
          {requests.map((req) => {
            const guestName = resolveUserDisplayName(req.guestId, profileById);
            const conflict = req.status === 'pending' && hasConflict(estateId, req.requestedFrom, req.requestedTo, req.id);
            return (
              <TouchableOpacity
                key={req.id}
                style={[styles.row, { borderColor: colors.icon + '22', backgroundColor: colors.background }]}
                onPress={() => router.push(`/(app)/estates/${estateId}/stays/${req.id}` as never)}
                activeOpacity={0.8}
              >
                <Avatar name={guestName} size={44} color={colors.tint} />
                <View style={styles.info}>
                  <ThemedText type="defaultSemiBold">{guestName}</ThemedText>
                  <ThemedText style={[styles.dates, { color: colors.icon }]}>
                    {formatDateRange(req.requestedFrom, req.requestedTo)}
                  </ThemedText>
                  {conflict && (
                    <View style={styles.conflictBadge}>
                      <IconSymbol name="exclamationmark.triangle.fill" size={12} color="#f59e0b" />
                      <ThemedText style={styles.conflictText}>Date conflict</ThemedText>
                    </View>
                  )}
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 28, fontWeight: '700' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, marginHorizontal: 20, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '500' },
  list: { paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10, gap: 12 },
  info: { flex: 1, gap: 2 },
  dates: { fontSize: 13 },
  conflictBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  conflictText: { fontSize: 11, color: '#f59e0b', fontWeight: '600' },
  right: { alignItems: 'flex-end', gap: 6 },
});
