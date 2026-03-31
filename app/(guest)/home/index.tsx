import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsSheet, type SettingsDestination } from '@/components/settings/settings-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionHeader } from '@/components/ui/section-header';
import { Colors, EstateColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDateRange, today } from '@/lib/date-utils';
import { guestEmailsMatch } from '@/lib/invite-email';
import { navigateToSettingsSection } from '@/lib/settings-navigation';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useStayStore } from '@/store/stay-store';

export default function GuestHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const {
    themePreference,
    setThemePreference,
    signOut,
    selectedTier,
    notificationsEnabled,
    setNotificationsEnabled,
  } = useAuthStore();
  const isDark = themePreference === 'dark';
  const [menuOpen, setMenuOpen] = useState(false);
  const allEstates = useEstateStore((s) => s.estates);
  const allStayRequests = useStayStore((s) => s.stayRequests);
  const allStays = useStayStore((s) => s.stays);
  const allInvitations = useInvitationStore((s) => s.invitations);
  const todayStr = today();

  const estates = useMemo(() => {
    const ids = allInvitations
      .filter(
        (inv) =>
          (guestEmailsMatch(inv.guestEmail, currentUser?.email) || inv.guestId === currentUser?.id) &&
          inv.status === 'accepted'
      )
      .map((inv) => inv.estateId);
    return allEstates.filter((e) => ids.includes(e.id));
  }, [allInvitations, allEstates, currentUser?.email, currentUser?.id]);

  const pendingCount = useMemo(
    () => allStayRequests.filter((r) => r.guestId === currentUser?.id && r.status === 'pending').length,
    [allStayRequests, currentUser?.id]
  );

  const upcomingStays = useMemo(
    () =>
      allStays
        .filter((s) => s.guestId === currentUser?.id && s.to >= todayStr)
        .sort((a, b) => a.from.localeCompare(b.from))
        .slice(0, 5),
    [allStays, currentUser?.id, todayStr]
  );

  const estateColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    estates.forEach((e, i) => { map[e.id] = EstateColors[i % EstateColors.length]; });
    return map;
  }, [estates]);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={{ flex: 1 }}>
          <ThemedText type="title" style={styles.greeting}>
            Good day, {currentUser?.name.split(' ')[0]}
          </ThemedText>
          <ThemedText style={[styles.sub, { color: colors.icon }]}>Lets plan</ThemedText>
        </View>
        <TouchableOpacity
          onPress={() => setMenuOpen(true)}
          style={[styles.menuBtn, { backgroundColor: colors.tint + '12' }]}
          activeOpacity={0.7}
        >
          <IconSymbol name="line.3.horizontal" size={20} color={colors.tint} />
        </TouchableOpacity>
      </View>

      <SettingsSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        colors={colors}
        insets={insets}
        currentUser={currentUser ? { name: currentUser.name, email: currentUser.email } : null}
        userRole={currentUser?.role ?? 'guest'}
        selectedTier={selectedTier}
        isDark={isDark}
        notificationsOn={notificationsEnabled}
        onToggleDark={(v: boolean) => setThemePreference(v ? 'dark' : 'light')}
        onToggleNotifications={setNotificationsEnabled}
        onNavigate={(dest: SettingsDestination) => navigateToSettingsSection(router, 'guest', dest)}
        onSignOut={() => {
          void signOut().then(() => router.replace('/(auth)' as never));
        }}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          <StatCard
            icon="building.2.fill"
            value={estates.length}
            label="Properties"
            color={colors.tint}
            colors={colors}
            onPress={() => router.push('/(guest)/estates' as never)}
          />
          <StatCard
            icon="suitcase.fill"
            value={pendingCount}
            label="Stays Pending"
            color={colors.tint}
            colors={colors}
            onPress={() => router.push('/(guest)/stays' as never)}
          />
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '30' }]}
            onPress={() => router.push('/(guest)/stays/plan' as never)}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.tint + '20' }]}>
              <IconSymbol name="calendar.badge.plus" size={22} color={colors.tint} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.actionTitle}>Plan a Stay</ThemedText>
            <ThemedText style={[styles.actionSub, { color: colors.icon }]}>Book your next trip</ThemedText>
          </TouchableOpacity>
        </View>

        <SectionHeader
          title="Upcoming Stays"
          actionLabel="See All"
          onAction={() => router.push('/(guest)/stays' as never)}
        />
        {upcomingStays.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="No upcoming stays"
            subtitle="Plan a stay or wait for approval from your host."
          />
        ) : (
          <View style={styles.upcomingList}>
            {upcomingStays.map((stay) => {
              const estate = estates.find((e) => e.id === stay.estateId);
              const dotColor = estateColorMap[stay.estateId] ?? colors.tint;
              return (
                <View
                  key={stay.id}
                  style={[styles.stayRow, { backgroundColor: colors.background, borderColor: colors.icon + '22' }]}
                >
                  <View style={[styles.colorBar, { backgroundColor: dotColor }]} />
                  <View style={styles.stayInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.stayGuest}>
                      {currentUser?.name ?? 'You'}
                    </ThemedText>
                    <ThemedText style={[styles.stayMeta, { color: colors.icon }]}>
                      {estate?.name} · {formatDateRange(stay.from, stay.to)}
                    </ThemedText>
                  </View>
                </View>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  menuBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  greeting: { fontSize: 28, fontWeight: '700' },
  sub: { fontSize: 14, marginTop: 2 },
  scroll: { paddingHorizontal: 20 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, padding: 12, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 4,
    shadowColor: '#2A1F18', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: '700', fontFamily: 'serif' },
  statLabel: { fontSize: 10, textAlign: 'center', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: 0.5 },

  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 8, justifyContent: 'center' },
  actionCard: {
    width: '100%', borderRadius: 18, borderWidth: 1, padding: 16, gap: 6, alignItems: 'center',
    shadowColor: '#2A1F18', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  actionTitle: { fontSize: 14, fontFamily: 'sans-serif', fontWeight: '600' },
  actionSub: { fontSize: 12, fontFamily: 'sans-serif' },

  upcomingList: { gap: 8, marginBottom: 4 },
  stayRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#2A1F18', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  colorBar: { width: 4, alignSelf: 'stretch' },
  stayInfo: { flex: 1, padding: 12, gap: 2 },
  stayGuest: { fontSize: 14 },
  stayMeta: { fontSize: 12 },
});
