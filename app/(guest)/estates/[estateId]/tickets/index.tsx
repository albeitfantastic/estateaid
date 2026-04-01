import { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StatusBadge } from '@/components/ui/badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useTicketStore } from '@/store/ticket-store';
import { formatDate } from '@/lib/date-utils';

const PRIORITY_COLORS: Record<string, string> = { low: '#94a3b8', normal: '#0a7ea4', high: '#f59e0b', urgent: '#ef4444' };

export default function GuestTickets() {
  const { t } = useTranslation();
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allTickets = useTicketStore((s) => s.tickets);
  const tickets = useMemo(() => allTickets.filter((t) => t.guestId === currentUser?.id && t.estateId === estateId), [allTickets, currentUser?.id, estateId]);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>{t('titles.myTickets')}</ThemedText>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.tint }]}
          onPress={() => router.push(`/(guest)/estates/${estateId}/tickets/new` as never)}
        >
          <IconSymbol name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {tickets.length === 0 ? (
        <EmptyState icon="exclamationmark.triangle.fill" title="No issues raised" subtitle="If something needs attention during your stay, raise a ticket here." actionLabel="Raise Issue" onAction={() => router.push(`/(guest)/estates/${estateId}/tickets/new` as never)} />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}>
          {tickets.map((ticket) => (
            <TouchableOpacity
              key={ticket.id}
              style={[styles.row, { borderColor: colors.icon + '22', backgroundColor: colors.background }]}
              onPress={() => router.push(`/(guest)/estates/${estateId}/tickets/${ticket.id}` as never)}
              activeOpacity={0.8}
            >
              <View style={[styles.priorityBar, { backgroundColor: PRIORITY_COLORS[ticket.priority] }]} />
              <View style={styles.info}>
                <ThemedText type="defaultSemiBold" numberOfLines={1}>{ticket.title}</ThemedText>
                <ThemedText style={[styles.date, { color: colors.icon }]}>{formatDate(ticket.createdAt.slice(0, 10))}</ThemedText>
                <ThemedText style={[styles.messages, { color: colors.icon }]}>{ticket.messages.length} message{ticket.messages.length !== 1 ? 's' : ''}</ThemedText>
              </View>
              <View style={styles.right}>
                <StatusBadge status={ticket.status} />
                <IconSymbol name="chevron.right" size={16} color={colors.icon} />
              </View>
            </TouchableOpacity>
          ))}
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
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, overflow: 'hidden', gap: 12 },
  priorityBar: { width: 4, alignSelf: 'stretch' },
  info: { flex: 1, paddingVertical: 14, gap: 2 },
  date: { fontSize: 12 },
  messages: { fontSize: 12 },
  right: { alignItems: 'flex-end', gap: 6, paddingRight: 14 },
});
