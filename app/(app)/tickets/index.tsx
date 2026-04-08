import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StatusBadge } from '@/components/ui/badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Elevation, Layout, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useTicketStore } from '@/store/ticket-store';
import { formatDate } from '@/lib/date-utils';
import type { Ticket, TicketPriority } from '@/types';

const PRIORITY_BAR: Record<TicketPriority, string> = {
  low: '#94a3b8',
  normal: '#0a7ea4',
  high: '#f59e0b',
  urgent: '#ef4444',
};

type StatusFilter = 'all' | 'open' | 'resolved';

function isTicketOpen(t: Ticket) {
  return t.status === 'open' || t.status === 'in_progress';
}

function isTicketResolved(t: Ticket) {
  const s = t.status as string;
  return s === 'resolved' || s === 'closed';
}

function priorityLabel(p: TicketPriority, t: (k: string) => string) {
  if (p === 'urgent' || p === 'high') return t('ticketsHub.priorityHigh');
  if (p === 'normal') return t('ticketsHub.priorityMedium');
  return t('ticketsHub.priorityLow');
}

function sortTickets(a: Ticket, b: Ticket) {
  const aOpen = isTicketOpen(a);
  const bOpen = isTicketOpen(b);
  if (aOpen !== bOpen) return aOpen ? -1 : 1;
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
  if (a.dueDate && !b.dueDate) return -1;
  if (!a.dueDate && b.dueDate) return 1;
  return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
}

export default function TicketsHub() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const allTickets = useTicketStore((s) => s.tickets);

  const ownedEstates = useMemo(
    () => allEstates.filter((e) => e.ownerId === (currentUser?.id ?? '')),
    [allEstates, currentUser?.id]
  );
  const ownedIds = useMemo(() => new Set(ownedEstates.map((e) => e.id)), [ownedEstates]);
  const estateById = useMemo(
    () => Object.fromEntries(ownedEstates.map((e) => [e.id, e] as const)),
    [ownedEstates]
  );

  const [estateFilter, setEstateFilter] = useState<string | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    let list = allTickets.filter((tk) => ownedIds.has(tk.estateId));
    if (estateFilter !== 'all') list = list.filter((tk) => tk.estateId === estateFilter);
    if (statusFilter === 'open') list = list.filter(isTicketOpen);
    if (statusFilter === 'resolved') list = list.filter(isTicketResolved);
    return [...list].sort(sortTickets);
  }, [allTickets, ownedIds, estateFilter, statusFilter]);

  return (
    <ThemedView style={styles.container}>
      
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        
        <ThemedText type="title" style={styles.title}>
        {t('titles.tickets')}
        </ThemedText>
        
        <TouchableOpacity
          onPress={() => router.push('/(app)/tickets/new-ticket' as never)}
          style={[styles.addBtn, { backgroundColor: colors.tint }, Elevation.fab[colorScheme ?? 'light']]}
          accessibilityRole="button"
          accessibilityLabel={t('ticketsHub.addTicket')}
          activeOpacity={0.85}
        >
          <IconSymbol name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {ownedEstates.length === 0 ? (
        <EmptyState
          icon="ticket.fill"
          title={t('ticketsHub.emptyTitle')}
          subtitle={t('ticketsHub.emptySub')}
        />
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                { borderColor: colors.icon + '44' },
                estateFilter === 'all' && { backgroundColor: colors.tint, borderColor: colors.tint },
              ]}
              onPress={() => setEstateFilter('all')}
            >
              <ThemedText
                style={[styles.filterChipText, estateFilter === 'all' && { color: '#fff', fontWeight: '700' }]}
              >
                {t('ticketsHub.allProperties')}
              </ThemedText>
            </TouchableOpacity>
            {ownedEstates.map((e) => {
              const active = estateFilter === e.id;
              return (
                <TouchableOpacity
                  key={e.id}
                  style={[
                    styles.filterChip,
                    { borderColor: colors.icon + '44' },
                    active && { backgroundColor: colors.tint, borderColor: colors.tint },
                  ]}
                  onPress={() => setEstateFilter(e.id)}
                >
                  <ThemedText
                    numberOfLines={1}
                    style={[styles.filterChipText, active && { color: '#fff', fontWeight: '700' }]}
                  >
                    {e.name}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.statusRow}>
            {(['all', 'open', 'resolved'] as const).map((key) => {
              const active = statusFilter === key;
              const label =
                key === 'all'
                  ? t('ticketsHub.statusAll')
                  : key === 'open'
                    ? t('ticketsHub.statusOpen')
                    : t('ticketsHub.statusResolved');
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.statusChip,
                    { borderColor: colors.icon + '33' },
                    active && { backgroundColor: colors.tint + '22', borderColor: colors.tint },
                  ]}
                  onPress={() => setStatusFilter(key)}
                >
                  <ThemedText style={[styles.statusChipText, active && { color: colors.tint, fontWeight: '700' }]}>
                    {label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>

          {filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyState icon="ticket.fill" title={t('ticketsHub.emptyTitle')} subtitle={t('ticketsHub.emptySub')} />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
              showsVerticalScrollIndicator={false}
            >
              {filtered.map((ticket) => {
                const estateName = estateById[ticket.estateId]?.name ?? '—';
                return (
                  <TouchableOpacity
                    key={ticket.id}
                    style={[styles.row, { borderColor: colors.icon + '22', backgroundColor: colors.background }]}
                    onPress={() =>
                      router.push(`/(app)/estates/${ticket.estateId}/tickets/${ticket.id}` as never)
                    }
                    activeOpacity={0.8}
                  >
                    <View style={[styles.priorityBar, { backgroundColor: PRIORITY_BAR[ticket.priority] }]} />
                    <View style={styles.info}>
                      <ThemedText type="defaultSemiBold" numberOfLines={1}>
                        {ticket.title}
                      </ThemedText>
                      <ThemedText style={[styles.meta, { color: colors.icon }]} numberOfLines={1}>
                        {estateName} · {priorityLabel(ticket.priority, t)}
                      </ThemedText>
                      {ticket.dueDate ? (
                        <ThemedText style={[styles.dueLine, { color: colors.icon }]}>
                          {t('ticketsHub.dueShort', { date: formatDate(ticket.dueDate) })}
                        </ThemedText>
                      ) : null}
                    </View>
                    <View style={styles.right}>
                      <StatusBadge status={ticket.status} />
                      <IconSymbol name="chevron.right" size={16} color={colors.icon} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPaddingX,
    paddingBottom: 8,
    gap: 4,
  },
  back: { padding: 4, marginTop: 2 },
  backSpacer: { width: 30 },
  title: { flex: 1, flexShrink: 1, fontSize: 28, fontWeight: '700', paddingRight: 8 },
  addBtn: {
    width: Layout.touchMin,
    height: Layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  filterRow: {
    paddingHorizontal: Layout.screenPaddingX,
    gap: 6,
    paddingTop: 0,
    paddingBottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    maxWidth: 200,
  },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  statusRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Layout.screenPaddingX,
    marginBottom: 6,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  statusChipText: { fontSize: 13 },
  list: { paddingHorizontal: Layout.screenPaddingX, gap: 6 },
  emptyWrap: { flex: 1, paddingTop: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 10,
  },
  priorityBar: { width: 4, alignSelf: 'stretch' },
  info: { flex: 1, paddingVertical: 10, paddingLeft: 2, gap: 1 },
  meta: { fontSize: 12 },
  dueLine: { fontSize: 12, fontWeight: '600' },
  right: { alignItems: 'flex-end', gap: 4, paddingRight: 10 },
});
