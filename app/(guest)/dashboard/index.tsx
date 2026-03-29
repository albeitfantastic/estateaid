import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayInfo, MonthGrid } from '@/components/calendar/month-grid';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionHeader } from '@/components/ui/section-header';
import { Colors, EstateColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDateRange, getDaysInRange, today } from '@/lib/date-utils';
import { getEventOccurrences, describeRecurrence } from '@/lib/event-utils';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useEventStore } from '@/store/event-store';
import { useInvitationStore } from '@/store/invitation-store';
import { SEED_USERS } from '@/store/seed-data';
import { useStayStore } from '@/store/stay-store';
import { useTicketStore } from '@/store/ticket-store';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function GuestDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const { themePreference, setThemePreference, clearUser, selectedTier } = useAuthStore();
  const isDark = themePreference === 'dark';
  const [menuOpen, setMenuOpen] = useState(false);
  const allEstates = useEstateStore((s) => s.estates);
  const allStayRequests = useStayStore((s) => s.stayRequests);
  const allStays = useStayStore((s) => s.stays);
  const allTickets = useTicketStore((s) => s.tickets);
  const allInvitations = useInvitationStore((s) => s.invitations);
  const allEvents = useEventStore((s) => s.events);
  const todayStr = today();

  const estates = useMemo(() => {
    const ids = allInvitations
      .filter((inv) => inv.guestEmail === currentUser?.email && inv.status === 'accepted')
      .map((inv) => inv.estateId);
    return allEstates.filter((e) => ids.includes(e.id));
  }, [allInvitations, allEstates, currentUser?.email]);
  const estateIds = useMemo(() => estates.map((e) => e.id), [estates]);

  const pendingCount = useMemo(
    () => allStayRequests.filter((r) => r.guestId === currentUser?.id && r.status === 'pending').length,
    [allStayRequests, currentUser?.id]
  );
  const openTicketsCount = useMemo(
    () => allTickets.filter((t) => estateIds.includes(t.estateId) && t.status !== 'resolved' && t.status !== 'closed').length,
    [allTickets, estateIds]
  );
  const activeStays = useMemo(
    () => allStays.filter((st) => st.guestId === currentUser?.id && st.from <= todayStr && st.to >= todayStr),
    [allStays, currentUser?.id, todayStr]
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

  // Interactive calendar state
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
    setSelectedDay(null);
  }

  const estateEvents = useMemo(
    () => allEvents.filter((ev) => estateIds.includes(ev.estateId)),
    [allEvents, estateIds]
  );

  const monthStart = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;
  const monthEnd = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${new Date(viewYear, viewMonth + 1, 0).getDate()}`;

  const dayInfoMap = useMemo(() => {
    const map: Record<string, DayInfo> = {};
    allStays.forEach((stay) => {
      const color = estateColorMap[stay.estateId];
      if (!color) return;
      getDaysInRange(stay.from, stay.to).forEach((dateStr) => {
        if (!map[dateStr]) map[dateStr] = { dateStr, dots: [] };
        map[dateStr].dots = [...(map[dateStr].dots ?? []), { color, key: stay.id }];
      });
    });
    estateEvents.forEach((ev) => {
      const dotColor = ev.color ?? '#64748B';
      getEventOccurrences(ev, monthStart, monthEnd).forEach((dateStr) => {
        if (!map[dateStr]) map[dateStr] = { dateStr, dots: [] };
        map[dateStr].dots = [...(map[dateStr].dots ?? []), { color: dotColor, key: ev.id + dateStr }];
      });
    });
    return map;
  }, [allStays, estateColorMap, estateEvents, monthStart, monthEnd]);

  const staysOnSelectedDay = selectedDay
    ? allStays.filter((s) => selectedDay >= s.from && selectedDay <= s.to && estateIds.includes(s.estateId))
    : [];
  const eventsOnSelectedDay = selectedDay
    ? estateEvents.filter((ev) => getEventOccurrences(ev, selectedDay, selectedDay).length > 0)
    : [];

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={{ flex: 1 }}>
          <ThemedText type="title" style={styles.greeting}>
            Good day, {currentUser?.name.split(' ')[0]}
          </ThemedText>
          <ThemedText style={[styles.sub, { color: colors.icon }]}>Your estate dashboard</ThemedText>
        </View>
        <TouchableOpacity
          onPress={() => setMenuOpen(true)}
          style={[styles.menuBtn, { backgroundColor: colors.tint + '12' }]}
          activeOpacity={0.7}
        >
          <IconSymbol name="line.3.horizontal" size={20} color={colors.tint} />
        </TouchableOpacity>
      </View>

      <SettingsMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        colors={colors}
        insets={insets}
        currentUser={currentUser}
        isDark={isDark}
        selectedTier={selectedTier}
        onToggleDark={(v) => setThemePreference(v ? 'dark' : 'light')}
        onSwitchRole={() => { clearUser(); router.replace('/(auth)' as never); }}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard
            icon="building.2.fill"
            value={estates.length}
            label="Estates"
            color={colors.tint}
            colors={colors}
            onPress={() => router.push('/(guest)/estates' as never)}
          />
        
          <StatCard
            icon="tray.fill"
            value={pendingCount}
            label="Pending"
            color="#f59e0b"
            colors={colors}
            onPress={() => router.push('/(guest)/requests' as never)}
          />
          {/*}
          <StatCard
            icon="exclamationmark.triangle.fill"
            value={openTicketsCount}
            label="Tickets"
            color="#ef4444"
            colors={colors}
            onPress={() => router.push('/(guest)/tickets' as never)}
          />*/}
        </View>
    
        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '30' }]}
            onPress={() => router.push('/(guest)/plan-stay' as never)}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.tint + '20' }]}>
              <IconSymbol name="calendar.badge.plus" size={22} color={colors.tint} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.actionTitle}>Request a Stay</ThemedText>
            <ThemedText style={[styles.actionSub, { color: colors.icon }]}>Browse estates</ThemedText>
          </TouchableOpacity>

          
        </View>

        {/* Upcoming Stays */}
        <SectionHeader
          title="Upcoming Stays"
          actionLabel="See All"
          onAction={() => router.push('/(guest)/home' as never)}
        />
        {upcomingStays.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="No upcoming stays"
            subtitle="Plan a stay or wait for guest requests."
          />
        ) : (
          <View style={styles.upcomingList}>
            {upcomingStays.map((stay) => {
              const estate = estates.find((e) => e.id === stay.estateId);
              const guest = SEED_USERS.find((u) => u.id === stay.guestId);
              const dotColor = estateColorMap[stay.estateId] ?? colors.tint;
              return (
                <View
                  key={stay.id}
                  style={[styles.stayRow, { backgroundColor: colors.background, borderColor: colors.icon + '22' }]}
                >
                  <View style={[styles.colorBar, { backgroundColor: dotColor }]} />
                  <View style={styles.stayInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.stayGuest}>
                      {guest?.name ?? stay.guestId}
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

        {/* Interactive Calendar */}
        <SectionHeader title="This Month" />
        <View style={styles.calendarNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <IconSymbol name="arrow.left" size={18} color={colors.tint} />
          </TouchableOpacity>
          <ThemedText type="defaultSemiBold" style={styles.monthLabel}>
            {MONTHS[viewMonth]} {viewYear}
          </ThemedText>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <IconSymbol name="arrow.right" size={18} color={colors.tint} />
          </TouchableOpacity>
        </View>
        <View style={[styles.calendarWrap, { backgroundColor: colors.background, borderColor: colors.icon + '22' }]}>
          <MonthGrid
            year={viewYear}
            month={viewMonth}
            dayInfoMap={dayInfoMap}
            onDayPress={(d) => setSelectedDay(selectedDay === d ? null : d)}
          />
        </View>

        {(estates.length > 0 || estateEvents.length > 0) && (
          <View style={styles.legend}>
            {estates.map((e, i) => (
              <View key={e.id} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: EstateColors[i % EstateColors.length] }]} />
                <ThemedText style={[styles.legendText, { color: colors.icon }]} numberOfLines={1}>{e.name}</ThemedText>
              </View>
            ))}
            {estateEvents.map((ev) => (
              <View key={ev.id} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: ev.color ?? '#64748B' }]} />
                <ThemedText style={[styles.legendText, { color: colors.icon }]} numberOfLines={1}>{ev.title}</ThemedText>
              </View>
            ))}
          </View>
        )}

        {selectedDay && (
          <View style={[styles.dayDetail, { backgroundColor: colors.surface, borderColor: colors.icon + '22' }]}>
            <View style={styles.dayDetailHeader}>
              <ThemedText type="defaultSemiBold" style={styles.dayDetailTitle}>{selectedDay}</ThemedText>
              <TouchableOpacity onPress={() => setSelectedDay(null)}>
                <IconSymbol name="xmark" size={14} color={colors.icon} />
              </TouchableOpacity>
            </View>
            {staysOnSelectedDay.length === 0 && eventsOnSelectedDay.length === 0 && (
              <ThemedText style={[styles.stayMeta, { color: colors.icon }]}>Nothing scheduled</ThemedText>
            )}
            {staysOnSelectedDay.map((stay) => {
              const estate = estates.find((e) => e.id === stay.estateId);
              const guest = SEED_USERS.find((u) => u.id === stay.guestId);
              const dotColor = estateColorMap[stay.estateId] ?? colors.tint;
              return (
                <View key={stay.id} style={[styles.dayStayRow, { borderLeftColor: dotColor }]}>
                  <ThemedText type="defaultSemiBold">{guest?.name ?? stay.guestId}</ThemedText>
                  <ThemedText style={[styles.stayMeta, { color: colors.icon }]}>
                    {estate?.name} · {formatDateRange(stay.from, stay.to)}
                  </ThemedText>
                </View>
              );
            })}
            {eventsOnSelectedDay.map((ev) => {
              const estate = estates.find((e) => e.id === ev.estateId);
              return (
                <View key={ev.id} style={[styles.dayStayRow, { borderLeftColor: ev.color ?? '#64748B' }]}>
                  <ThemedText type="defaultSemiBold">{ev.title}</ThemedText>
                  <ThemedText style={[styles.stayMeta, { color: colors.icon }]}>
                    {estate?.name} · {describeRecurrence(ev)}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

interface SettingsMenuProps {
  visible: boolean;
  onClose: () => void;
  colors: typeof Colors.light;
  insets: { top: number; bottom: number };
  currentUser: { name: string; email: string } | null;
  isDark: boolean;
  selectedTier: string | null;
  onToggleDark: (v: boolean) => void;
  onSwitchRole: () => void;
}

function SettingsMenu({ visible, onClose, colors, insets, currentUser, isDark, selectedTier, onToggleDark, onSwitchRole }: SettingsMenuProps) {
  const initials = currentUser?.name.split(' ').map((n) => n[0]).join('').slice(0, 2) ?? '';
  const tierLabel = selectedTier === 'premium' ? 'Premium' : 'Starter';

  function menuRow(icon: string, label: string, onPress?: () => void, trailing?: React.ReactNode) {
    return (
      <TouchableOpacity
        key={label}
        style={[menuStyles.row, { borderBottomColor: colors.border }]}
        onPress={onPress}
        disabled={!onPress && !trailing}
        activeOpacity={onPress ? 0.6 : 1}
      >
        <View style={[menuStyles.rowIcon, { backgroundColor: colors.tint + '12' }]}>
          <IconSymbol name={icon as never} size={18} color={colors.tint} />
        </View>
        <ThemedText style={menuStyles.rowLabel}>{label}</ThemedText>
        {trailing ?? <IconSymbol name="chevron.right" size={14} color={colors.icon} />}
      </TouchableOpacity>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <Pressable style={menuStyles.backdrop} onPress={onClose}>
        <Pressable style={[menuStyles.sheet, { backgroundColor: colors.surface, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
          <View style={menuStyles.sheetHeader}>
            <ThemedText type="title" style={menuStyles.sheetTitle}>Settings</ThemedText>
            <TouchableOpacity onPress={onClose} style={[menuStyles.closeBtn, { backgroundColor: colors.icon + '15' }]}>
              <IconSymbol name="xmark" size={16} color={colors.icon} />
            </TouchableOpacity>
          </View>

          <View style={[menuStyles.profileCard, { backgroundColor: colors.tint + '08', borderColor: colors.border }]}>
            <View style={[menuStyles.avatar, { backgroundColor: colors.tint }]}>
              <ThemedText style={menuStyles.avatarText}>{initials}</ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>{currentUser?.name}</ThemedText>
              <ThemedText style={[menuStyles.email, { color: colors.icon }]}>{currentUser?.email}</ThemedText>
            </View>
            <View style={[menuStyles.tierBadge, { backgroundColor: colors.tint + '18' }]}>
              <ThemedText style={[menuStyles.tierText, { color: colors.tint }]}>{tierLabel}</ThemedText>
            </View>
          </View>

          <ScrollView style={menuStyles.menuList} showsVerticalScrollIndicator={false}>
            {menuRow('person.fill', 'Edit Profile', () => { onClose(); })}
            {menuRow('creditcard.fill', 'Manage Subscription', () => { onClose(); })}
            {menuRow(isDark ? 'moon.fill' : 'sun.max.fill', 'Dark Mode', undefined,
              <Switch
                value={isDark}
                onValueChange={onToggleDark}
                trackColor={{ false: colors.border, true: colors.tint }}
                thumbColor="#fff"
              />
            )}
            {menuRow('bell.fill', 'Notifications', () => { onClose(); })}
            {menuRow('questionmark.circle.fill', 'Help & Support', () => { onClose(); })}
            {menuRow('doc.text.fill', 'Privacy Policy', () => { onClose(); })}
            {menuRow('arrow.left.arrow.right', 'Switch Role', () => {
              onClose();
              Alert.alert('Switch Role', 'Sign out and switch to a different role?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Switch', style: 'destructive', onPress: onSwitchRole },
              ]);
            })}
          </ScrollView>

          <TouchableOpacity
            style={[menuStyles.signOutBtn, { borderColor: colors.error }]}
            onPress={() => {
              onClose();
              Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: onSwitchRole },
              ]);
            }}
            activeOpacity={0.7}
          >
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={16} color={colors.error} />
            <ThemedText style={{ color: colors.error, fontWeight: '600' }}>Sign Out</ThemedText>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const menuStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { flex: 1, maxWidth: 340, paddingHorizontal: 20 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sheetTitle: { fontSize: 24, fontWeight: '700' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 20, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  email: { fontSize: 12, marginTop: 2 },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  tierText: { fontSize: 11, fontWeight: '700' },
  menuList: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, marginTop: 8 },
});

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
  statCard: { flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 10, textAlign: 'center' },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 8, justifyContent: 'center' },
  actionCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 6,
    alignItems: 'center',
  },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  actionTitle: { fontSize: 14 },
  actionSub: { fontSize: 12 },

  // Upcoming stays
  upcomingList: { gap: 8, marginBottom: 4 },
  stayRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  colorBar: { width: 4, alignSelf: 'stretch' },
  stayInfo: { flex: 1, padding: 12, gap: 2 },
  stayGuest: { fontSize: 14 },
  stayMeta: { fontSize: 12 },

  // Calendar
  calendarNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  navBtn: { padding: 8 },
  monthLabel: { fontSize: 16 },
  calendarWrap: { padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
  dayDetail: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10, marginBottom: 4 },
  dayDetailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayDetailTitle: { fontSize: 14 },
  dayStayRow: { paddingLeft: 10, borderLeftWidth: 3, gap: 2 },
});
