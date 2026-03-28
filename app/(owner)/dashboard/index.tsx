import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemo } from 'react';

import { EstateCard } from '@/components/ui/estate-card';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/section-header';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useStayStore } from '@/store/stay-store';
import { useTicketStore } from '@/store/ticket-store';
import { today } from '@/lib/date-utils';

export default function OwnerDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const allStayRequests = useStayStore((s) => s.stayRequests);
  const allStays = useStayStore((s) => s.stays);
  const allTickets = useTicketStore((s) => s.tickets);
  const todayStr = today();

  const estates = useMemo(
    () => allEstates.filter((e) => e.ownerId === currentUser?.id),
    [allEstates, currentUser?.id]
  );
  const estateIds = useMemo(() => estates.map((e) => e.id), [estates]);

  const pendingCount = useMemo(
    () => allStayRequests.filter((r) => estateIds.includes(r.estateId) && r.status === 'pending').length,
    [allStayRequests, estateIds]
  );
  const openTicketsCount = useMemo(
    () => allTickets.filter((t) => estateIds.includes(t.estateId) && t.status !== 'resolved' && t.status !== 'closed').length,
    [allTickets, estateIds]
  );
  const activeStays = useMemo(
    () => allStays.filter((st) => estateIds.includes(st.estateId) && st.from <= todayStr && st.to >= todayStr),
    [allStays, estateIds, todayStr]
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View>
          <ThemedText type="title" style={styles.greeting}>
            Good day, {currentUser?.name.split(' ')[0]}
          </ThemedText>
          <ThemedText style={[styles.sub, { color: colors.icon }]}>Your estate dashboard</ThemedText>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.tint }]}
          onPress={() => router.push('/(owner)/estates/new' as never)}
        >
          <IconSymbol name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard
            icon="building.2.fill"
            value={estates.length}
            label="Estates"
            color={colors.tint}
            colors={colors}
            onPress={() => router.push('/(owner)/estates' as never)}
          />
          <StatCard
            icon="person.2.fill"
            value={activeStays.length}
            label="Active Guests"
            color="#22c55e"
            colors={colors}
            onPress={() => router.push('/(owner)/visitors' as never)}
          />
          <StatCard
            icon="tray.fill"
            value={pendingCount}
            label="Pending"
            color="#f59e0b"
            colors={colors}
            onPress={() => router.push('/(owner)/requests' as never)}
          />
          <StatCard
            icon="exclamationmark.triangle.fill"
            value={openTicketsCount}
            label="Tickets"
            color="#ef4444"
            colors={colors}
            onPress={() => router.push('/(owner)/tickets' as never)}
          />
        </View>

        {/* Estates */}
        <SectionHeader
          title="Calendar"
          actionLabel="See All"
          onAction={() => router.push('/(owner)/estates' as never)}
        />
        {estates.length === 0 ? (
          <EmptyState
            icon="building.2.fill"
            title="No estates yet"
            subtitle="Add your first vacation home."
            actionLabel="Add Estate"
            onAction={() => router.push('/(owner)/estates/new' as never)}
          />
        ) : (
          <View style={styles.estateList}>
            {estates.slice(0, 3).map((estate) => {
              const hasActive = activeStays.some((s) => s.estateId === estate.id);
              return (
                <EstateCard
                  key={estate.id}
                  estate={estate}
                  badge={hasActive ? { label: 'Occupied', color: '#22c55e' } : undefined}
                  onPress={() => router.push(`/(owner)/estates/${estate.id}` as never)}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

interface StatCardProps {
  icon: string;
  value: number;
  label: string;
  color: string;
  colors: typeof Colors.light;
  onPress?: () => void;
}

function StatCard({ icon, value, label, color, colors, onPress }: StatCardProps) {
  return (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: color + '12', borderColor: color + '33' }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.75 : 1}
    >
      <IconSymbol name={icon as never} size={22} color={color} />
      <ThemedText style={[styles.statValue, { color }]}>{value}</ThemedText>
      <ThemedText style={[styles.statLabel, { color: colors.icon }]}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  greeting: { fontSize: 28, fontWeight: '700' },
  sub: { fontSize: 14, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  scroll: { paddingHorizontal: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  statCard: { flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 10, textAlign: 'center' },
  estateList: {},
});
