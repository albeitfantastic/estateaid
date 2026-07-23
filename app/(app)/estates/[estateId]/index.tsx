import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HostProLockTouchable } from '@/components/ui/host-pro-lock';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Elevation, Fonts, Layout, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useStayStore } from '@/store/stay-store';
import { getEstateRole } from '@/lib/estate-role';
import { addDays, today } from '@/lib/date-utils';
import { useHasFullHostAccess } from '@/lib/access-tier';
import { debugLog } from '@/lib/debug-session-log';
import { useMemo } from 'react';

const OWNER_ITEMS = [
  { label: 'Guests', icon: 'person.2.fill', route: 'guests', primary: true },
  { label: 'Stay Requests', icon: 'calendar', route: 'stays', primary: true },
  { label: 'Availability', icon: 'calendar.badge.exclamationmark', route: 'availability', primary: false },
  { label: 'Events', icon: 'calendar.badge.clock', route: 'events', primary: false },
  { label: 'FAQ', icon: 'questionmark.circle.fill', route: 'faq', primary: false },
  { label: 'Documents', icon: 'doc.fill', route: 'documents', primary: false },
  { label: 'Contacts', icon: 'phone.fill', route: 'contacts', primary: false },
  { label: 'Activity', icon: 'clock.fill', route: 'activity', primary: false },
] as const;

const GUEST_ITEMS = [
  { label: 'Plan a Stay', icon: 'calendar', route: 'request-stay', alwaysOn: true },
  { label: 'My Stays', icon: 'checkmark.circle.fill', route: 'my-stays', alwaysOn: true },
  { label: 'FAQ', icon: 'questionmark.circle.fill', route: 'faq', alwaysOn: false },
  { label: 'Documents', icon: 'doc.fill', route: 'documents', alwaysOn: false },
  { label: 'Contacts', icon: 'phone.fill', route: 'contacts', alwaysOn: false },
  { label: 'Maintenance', icon: 'calendar.badge.clock', route: 'events', alwaysOn: false },
  { label: 'Activity', icon: 'clock.fill', route: 'activity', alwaysOn: false },
] as const;

export default function EstateHub() {
  const { t } = useTranslation();
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const estate = useEstateStore((s) => s.estates.find((e) => e.id === estateId));
  const currentUser = useAuthStore((s) => s.currentUser);
  const allInvitations = useInvitationStore((s) => s.invitations);
  const allStays = useStayStore((s) => s.stays);
  const todayStr = today();
  const hasFullHost = useHasFullHostAccess();

  const isEstateOwner = estate?.ownerId === currentUser?.id;
  // #region agent log
  debugLog('H4', 'estates/[estateId]/index.tsx:role', 'computing estateRole', {
    hasEstate: !!estate,
    hasCurrentUser: !!currentUser,
    isEstateOwner,
    estateId,
  });
  // #endregion
  const estateRole = isEstateOwner
    ? 'owner'
    : getEstateRole(allInvitations, estateId, currentUser!.id, currentUser?.email);

  const hasContextAccess = useMemo(() => {
    if (estateRole === 'owner') return true;
    return allStays.some(
      (s) =>
        s.estateId === estateId &&
        s.guestId === currentUser?.id &&
        todayStr >= addDays(s.from, -3) &&
        todayStr <= addDays(s.to, 1)
    );
  }, [allStays, estateId, currentUser?.id, todayStr, estateRole]);

  if (!estate) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>Estate not found.</ThemedText>
      </ThemedView>
    );
  }

  // Owner: full hub (Standard tier: host tiles show lock until Maison Pro / trial)
  if (estateRole === 'owner') {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + Layout.sectionGap - 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <IconSymbol name="arrow.left" size={22} color={colors.tint} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <ThemedText type="title" style={styles.name} numberOfLines={1}>{estate.name}</ThemedText>
            <View style={styles.locationRow}>
              <IconSymbol name="map.fill" size={13} color={colors.icon} />
              <ThemedText style={[styles.location, { color: colors.icon }]}>{estate.location}</ThemedText>
            </View>
          </View>
          <HostProLockTouchable
            locked={!hasFullHost}
            onPress={() => router.push(`/(app)/estates/${estateId}/edit` as never)}
            style={styles.editBtn}
          >
            <IconSymbol name="pencil" size={20} color={colors.tint} />
          </HostProLockTouchable>
        </View>
        <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + Spacing.xl }]}>
          {estate.description && (
            <ThemedText style={[styles.description, { color: colors.icon }]}>{estate.description}</ThemedText>
          )}
          <View style={styles.tiles}>
            {OWNER_ITEMS.map((item) => (
              <HostProLockTouchable
                key={item.route}
                locked={!hasFullHost}
                onPress={() => router.push(`/(app)/estates/${estateId}/${item.route}` as never)}
                style={[
                  styles.tile,
                  {
                    backgroundColor: item.primary ? colors.tintMuted : colors.surface,
                    borderColor: item.primary ? colors.tintMuted : colors.border,
                  },
                  Elevation.card[scheme],
                ]}
              >
                <IconSymbol name={item.icon} size={28} color={colors.tint} />
                <ThemedText type="defaultSemiBold" style={styles.tileLabel}>
                  {item.route === 'events' ? t('titles.events') : item.label}
                </ThemedText>
              </HostProLockTouchable>
            ))}
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  // Guest (owner invited to another owner's estate): time-gated tiles
  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Layout.sectionGap - 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <ThemedText type="title" style={styles.name} numberOfLines={1}>{estate.name}</ThemedText>
            <View style={[styles.adminBadge, { backgroundColor: colors.icon + '15' }]}>
              <ThemedText style={[styles.adminBadgeText, { color: colors.icon }]}>Guest</ThemedText>
            </View>
          </View>
          <View style={styles.locationRow}>
            <IconSymbol name="map.fill" size={13} color={colors.icon} />
            <ThemedText style={[styles.location, { color: colors.icon }]}>{estate.location}</ThemedText>
          </View>
        </View>
      </View>
      <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + Spacing.xl }]}>
        {estate.description && (
          <ThemedText style={[styles.description, { color: colors.icon }]}>{estate.description}</ThemedText>
        )}
        <View style={styles.tiles}>
          {GUEST_ITEMS.map((item) => {
            const unlocked = item.alwaysOn || hasContextAccess;
            return (
              <TouchableOpacity
                key={item.route}
                style={[
                  styles.tile,
                  { backgroundColor: colors.tint + '11', borderColor: colors.tint + '22' },
                  !unlocked && styles.tileLocked,
                ]}
                onPress={() => {
                  if (!unlocked) return;
                  const target = `/(app)/estates/${estateId}/${item.route}`;
                  // #region agent log
                  debugLog('H1', 'estates/[estateId]/index.tsx:guest-nav', 'guest tile navigate', {
                    label: item.label,
                    route: item.route,
                    target,
                    estateId,
                  });
                  // #endregion
                  router.push(target as never);
                }}
                activeOpacity={unlocked ? 0.75 : 1}
              >
                <IconSymbol name={item.icon} size={28} color={unlocked ? colors.tint : colors.icon} />
                <ThemedText type="defaultSemiBold" style={[styles.tileLabel, !unlocked && { color: colors.icon }]}>
                  {item.route === 'events' ? t('titles.events') : item.label}
                </ThemedText>
                {!unlocked && (
                  <View style={styles.lockBadge}>
                    <IconSymbol name="lock.fill" size={10} color={colors.icon} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        {!hasContextAccess && (
          <View style={[styles.hint, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            <IconSymbol name="lock.fill" size={13} color={colors.icon} />
            <ThemedText style={[styles.hintText, { color: colors.icon }]}>
              FAQ, Documents, Contacts and Maintenance unlock 3 days before your stay.
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPaddingX,
    paddingBottom: Layout.sectionGap,
    gap: 12,
  },
  back: { padding: 4 },
  editBtn: { padding: 8, minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 22, fontWeight: '700', flexShrink: 1 },
  adminBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  adminBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { fontSize: 13 },
  grid: { paddingHorizontal: Layout.screenPaddingX, paddingTop: 10 },
  description: { fontSize: 14, lineHeight: 20, marginBottom: Layout.sectionGap },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '47%',
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 10,
  },
  tileLabel: { fontSize: 14, textAlign: 'center', fontFamily: Fonts.label, fontWeight: '500' },
  tileLocked: { opacity: 0.38 },
  lockBadge: { position: 'absolute', bottom: 8, right: 8 },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: Radius.lg,
    marginTop: Layout.sectionGap,
    borderWidth: StyleSheet.hairlineWidth,
  },
  hintText: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: Fonts.body },
});
