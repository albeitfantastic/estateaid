import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { SettingsSheet, type SettingsDestination } from '@/components/settings/settings-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionHeader } from '@/components/ui/section-header';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Colors, EstateColors, Layout, Radius, type ThemeColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDateRange, today } from '@/lib/date-utils';
import { guestEmailsMatch } from '@/lib/invite-email';
import { navigateToSettingsSection } from '@/lib/settings-navigation';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useStayStore } from '@/store/stay-store';

export default function GuestHome() {
  const { t } = useTranslation();
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
      <View style={[styles.header, { paddingTop: insets.top + Layout.sectionGap }]}>
        <View style={{ flex: 1 }}>
          <ThemedText type="title" style={styles.greeting}>
            {t('guestHome.greeting', { name: currentUser?.name.split(' ')[0] ?? '' })}
          </ThemedText>
          <ThemedText type="caption" style={[styles.sub, { color: colors.textSecondary }]}>
            {t('guestHome.sub')}
          </ThemedText>
        </View>
        <TouchableOpacity
          onPress={() => setMenuOpen(true)}
          style={[
            styles.menuBtn,
            {
              backgroundColor: colors.tintMuted,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border,
            },
          ]}
          activeOpacity={0.7}
        >
          <IconSymbol name="line.3.horizontal" size={22} color={colors.tint} />
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
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Layout.sectionGap + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          <StatCard
            icon="building.2.fill"
            value={estates.length}
            label={t('guestHome.properties')}
            color={colors.tint}
            colors={colors}
            onPress={() => router.push('/(guest)/estates' as never)}
          />
          <StatCard
            icon="suitcase.fill"
            value={pendingCount}
            label={t('guestHome.staysPending')}
            color={colors.tint}
            colors={colors}
            onPress={() => router.push('/(guest)/stays' as never)}
          />
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionTouchable}
            onPress={() => router.push('/(guest)/stays/plan' as never)}
            activeOpacity={0.75}
          >
            <SurfaceCard
              variant="elevated"
              style={[styles.actionCardShell, { borderTopWidth: 3, borderTopColor: colors.tint }]}
              contentStyle={styles.actionCardInner}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.tintMuted }]}>
                <IconSymbol name="calendar.badge.plus" size={22} color={colors.tint} />
              </View>
              <ThemedText type="defaultSemiBold" style={styles.actionTitle}>
                {t('guestHome.planStay')}
              </ThemedText>
              <ThemedText type="caption" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                {t('guestHome.planStaySub')}
              </ThemedText>
            </SurfaceCard>
          </TouchableOpacity>
        </View>

        <SectionHeader
          title={t('guestHome.upcomingStays')}
          actionLabel={t('guestHome.seeAll')}
          onAction={() => router.push('/(guest)/stays' as never)}
        />
        {upcomingStays.length === 0 ? (
          <EmptyState
            icon="calendar"
            title={t('guestHome.noUpcomingTitle')}
            subtitle={t('guestHome.noUpcomingSub')}
          />
        ) : (
          <View style={styles.upcomingList}>
            {upcomingStays.map((stay) => {
              const estate = estates.find((e) => e.id === stay.estateId);
              const dotColor = estateColorMap[stay.estateId] ?? colors.tint;
              return (
                <SurfaceCard
                  key={stay.id}
                  variant="elevated"
                  padded={false}
                  accentColor={dotColor}
                  accentWidth={4}
                  contentStyle={styles.stayRowInner}
                >
                  <View style={styles.stayInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.stayGuest}>
                      {currentUser?.name ?? t('common.you')}
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                      {estate?.name} · {formatDateRange(stay.from, stay.to)}
                    </ThemedText>
                  </View>
                </SurfaceCard>
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
  colors: ThemeColors;
  onPress?: () => void;
}

function StatCard({ icon, value, label, color, colors, onPress }: StatCardProps) {
  return (
    <TouchableOpacity
      style={styles.statTouchable}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.75 : 1}
    >
      <SurfaceCard
        variant="elevated"
        contentStyle={styles.statCardInner}
        style={{ borderTopWidth: 3, borderTopColor: color }}
      >
        <View style={[styles.statIconWrap, { backgroundColor: colors.tintMuted }]}>
          <IconSymbol name={icon as never} size={20} color={color} />
        </View>
        <ThemedText type="statValue" style={{ color }}>
          {value}
        </ThemedText>
        <ThemedText type="statLabel" style={{ color: colors.textSecondary, textAlign: 'center' }}>
          {label}
        </ThemedText>
      </SurfaceCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPaddingX,
    paddingBottom: Layout.sectionGap,
    gap: 12,
  },
  menuBtn: {
    width: Layout.touchMin,
    height: Layout.touchMin,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: { fontSize: 30, fontWeight: '700', letterSpacing: -0.8 },
  sub: { marginTop: 6 },
  scroll: { paddingHorizontal: Layout.screenPaddingX },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: Layout.sectionGap },
  statTouchable: { flex: 1 },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardInner: { alignItems: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 8 },

  actionRow: { flexDirection: 'row', gap: 12, marginBottom: Layout.sectionGap, justifyContent: 'center' },
  actionTouchable: { width: '100%' },
  actionCardShell: { width: '100%' },
  actionCardInner: { gap: 8, paddingVertical: 16, paddingHorizontal: 14, alignItems: 'center' },
  actionIcon: {
    width: Layout.touchMin,
    height: Layout.touchMin,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: { fontSize: 15 },

  upcomingList: { gap: 10, marginBottom: 8 },
  stayRowInner: { paddingVertical: 14, paddingHorizontal: 14, gap: 4 },
  stayInfo: { flex: 1, gap: 4 },
  stayGuest: { fontSize: 15 },
});
