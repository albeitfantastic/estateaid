import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HostProLockTouchable } from '@/components/ui/host-pro-lock';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SetupChecklist } from '@/components/ui/setup-checklist';
import { SponsorCoverageBanner } from '@/components/ui/sponsor-coverage-banner';
import { Colors, Elevation, Fonts, Layout, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCan, type Capability } from '@/lib/entitlements/capabilities';
import type { UpgradeFeature } from '@/lib/maison-pro-upgrade';
import { addDays, today } from '@/lib/date-utils';
import { getEstateActorRole } from '@/lib/estate-role';
import { useAuthStore } from '@/store/auth-store';
import { useContactStore } from '@/store/contact-store';
import { useDocumentStore } from '@/store/document-store';
import { useEstateCoverageStore } from '@/store/estate-coverage-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useStayStore } from '@/store/stay-store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const OWNER_ITEMS: {
  label: string;
  icon: string;
  route: string;
  primary: boolean;
  cap: Capability;
  feature: UpgradeFeature;
  countKey?: 'documents' | 'contacts' | 'guests';
}[] = [
  { label: 'Guests', icon: 'person.2.fill', route: 'guests', primary: false, cap: 'activity.view', feature: 'guests.invite', countKey: 'guests' },
  { label: 'Stay Requests', icon: 'calendar', route: 'stays', primary: false, cap: 'activity.view', feature: 'stays.approve' },
  { label: 'Availability', icon: 'calendar.badge.exclamationmark', route: 'availability', primary: false, cap: 'availability.read', feature: 'availability.write' },
  { label: 'FAQ', icon: 'questionmark.circle.fill', route: 'faq', primary: false, cap: 'faq.read', feature: 'generic' },
  { label: 'Documents', icon: 'doc.fill', route: 'documents', primary: false, cap: 'documents.read', feature: 'documents.upload', countKey: 'documents' },
  { label: 'Contacts', icon: 'phone.fill', route: 'contacts', primary: false, cap: 'contacts.read', feature: 'generic', countKey: 'contacts' },
  { label: 'Activity', icon: 'clock.fill', route: 'activity', primary: false, cap: 'activity.view', feature: 'generic' },
  { label: 'Handover', icon: 'checkmark.circle.fill', route: 'handover', primary: false, cap: 'property.edit', feature: 'generic' },
  { label: 'Expenses', icon: 'creditcard.fill', route: 'expenses', primary: false, cap: 'property.edit', feature: 'generic' },
];

type GuestHubItem =
  | { label: string; icon: string; href: 'plan' | 'my-stays'; alwaysOn: true }
  | { label: string; icon: string; route: string; alwaysOn: boolean };

const GUEST_ITEMS: GuestHubItem[] = [
  { label: 'Request dates', icon: 'calendar', href: 'plan', alwaysOn: true },
  { label: 'My Stays', icon: 'checkmark.circle.fill', href: 'my-stays', alwaysOn: true },
  { label: 'FAQ', icon: 'questionmark.circle.fill', route: 'faq', alwaysOn: false },
  { label: 'Documents', icon: 'doc.fill', route: 'documents', alwaysOn: false },
  { label: 'Contacts', icon: 'phone.fill', route: 'contacts', alwaysOn: false },
  { label: 'Handover', icon: 'checkmark.circle.fill', route: 'handover', alwaysOn: false },
  { label: 'Activity', icon: 'clock.fill', route: 'activity', alwaysOn: false },
];

export default function EstateHub() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const estates = useEstateStore((s) => s.estates);
  const estate = estates.find((e) => e.id === estateId);
  const currentUser = useAuthStore((s) => s.currentUser);
  const allInvitations = useInvitationStore((s) => s.invitations);
  const allStays = useStayStore((s) => s.stays);
  const documents = useDocumentStore((s) => s.documents);
  const contacts = useContactStore((s) => s.contacts);
  const todayStr = today();
  const can = useCan();
  const estateCtx = { estateId: estateId as string };
  const fetchCoverage = useEstateCoverageStore((s) => s.fetchCoverage);

  useEffect(() => {
    if (estateId) void fetchCoverage([estateId]);
  }, [estateId, fetchCoverage]);

  const actorRole = useMemo(() => {
    if (!estate || !currentUser) return 'none' as const;
    return getEstateActorRole(estates, allInvitations, estateId, currentUser.id, currentUser.email);
  }, [estate, currentUser, estates, allInvitations, estateId]);

  const isHost = actorRole === 'sponsor' || actorRole === 'owner';

  const docCount = useMemo(
    () => documents.filter((d) => d.estateId === estateId).length,
    [documents, estateId]
  );
  const contactCount = useMemo(
    () => contacts.filter((c) => c.estateId === estateId).length,
    [contacts, estateId]
  );
  const guestCount = useMemo(
    () =>
      allInvitations.filter(
        (i) => i.estateId === estateId && (i.status === 'accepted' || i.status === 'pending')
      ).length,
    [allInvitations, estateId]
  );

  function tileCountLabel(key?: 'documents' | 'contacts' | 'guests'): string | null {
    if (key === 'documents' && docCount > 0) return String(docCount);
    if (key === 'contacts' && contactCount > 0) return String(contactCount);
    if (key === 'guests' && guestCount > 0) return String(guestCount);
    return null;
  }

  const hasContextAccess = useMemo(() => {
    if (isHost) return true;
    if (!currentUser) return false;
    return allStays.some(
      (s) =>
        s.estateId === estateId &&
        s.guestId === currentUser.id &&
        todayStr >= addDays(s.from, -3) &&
        todayStr <= addDays(s.to, 1)
    );
  }, [allStays, estateId, currentUser, todayStr, isHost]);

  const contextUnlockLabel = useMemo(() => {
    if (hasContextAccess || !currentUser) return null;
    const upcoming = allStays
      .filter((s) => s.estateId === estateId && s.guestId === currentUser.id && todayStr < addDays(s.from, -3))
      .sort((a, b) => a.from.localeCompare(b.from))[0];
    if (!upcoming) return 'Available during your stay';
    const unlockDay = addDays(upcoming.from, -3);
    const days = Math.ceil(
      (new Date(unlockDay).getTime() - new Date(todayStr).getTime()) / 86400000
    );
    if (days > 0) return `Unlocks in ${days} day${days === 1 ? '' : 's'}`;
    return 'Unlocks 3 days before your stay';
  }, [allStays, estateId, currentUser, todayStr, hasContextAccess]);

  if (!estate) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>Estate not found.</ThemedText>
      </ThemedView>
    );
  }

  if (!currentUser) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>Loading…</ThemedText>
      </ThemedView>
    );
  }

  if (isHost) {
    const canEdit = can('property.edit', estateCtx);
    // Coverage lapse copy lives on SponsorCoverageBanner — no upgrade pitch in the header.
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + Layout.sectionGap - 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <IconSymbol name="arrow.left" size={22} color={colors.tint} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <ThemedText type="title" style={styles.name} numberOfLines={1}>
              {estate.name}
            </ThemedText>
            <View style={styles.locationRow}>
              <IconSymbol name="map.fill" size={13} color={colors.icon} />
              <ThemedText style={[styles.location, { color: colors.icon }]}>{estate.location}</ThemedText>
            </View>
          </View>
          <HostProLockTouchable
            locked={!canEdit}
            feature="generic"
            estateId={estateId}
            onPress={() => router.push(`/(app)/estates/${estateId}/edit` as never)}
            style={styles.editBtn}
          >
            <IconSymbol name="pencil" size={20} color={colors.tint} />
          </HostProLockTouchable>
        </View>
        <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <SponsorCoverageBanner estateId={estateId as string} />
          {estate.description ? (
            <ThemedText style={[styles.description, { color: colors.icon }]}>{estate.description}</ThemedText>
          ) : null}
          <SetupChecklist estateId={estateId as string} />
          <View style={styles.tiles}>
            {OWNER_ITEMS.map((item) => {
              const canOpen = can(item.cap, estateCtx);
              const locked = !canOpen;
              const count = tileCountLabel(item.countKey);
              return (
                <HostProLockTouchable
                  key={item.route}
                  locked={locked}
                  feature={item.feature}
                  estateId={estateId}
                  returnTo={`/(app)/estates/${estateId}/${item.route}`}
                  onPress={() => router.push(`/(app)/estates/${estateId}/${item.route}` as never)}
                  style={[
                    styles.tile,
                    {
                      backgroundColor: item.primary ? colors.tintMuted : colors.surface,
                      borderColor: item.primary ? colors.tintMuted : colors.border,
                      opacity: count == null && !locked ? 0.85 : 1,
                    },
                    Elevation.card[scheme],
                  ]}
                >
                  <IconSymbol name={item.icon as never} size={28} color={colors.tint} />
                  <ThemedText type="defaultSemiBold" style={styles.tileLabel}>
                    {item.label}
                    {count != null ? ` · ${count}` : ''}
                  </ThemedText>
                </HostProLockTouchable>
              );
            })}
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Layout.sectionGap - 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <ThemedText type="title" style={styles.name} numberOfLines={1}>
              {estate.name}
            </ThemedText>
            <View style={[styles.guestBadge, { backgroundColor: colors.tintMuted }]}>
              <ThemedText style={[styles.guestBadgeText, { color: colors.tint }]}>Guest</ThemedText>
            </View>
          </View>
          <View style={styles.locationRow}>
            <IconSymbol name="map.fill" size={13} color={colors.icon} />
            <ThemedText style={[styles.location, { color: colors.icon }]}>{estate.location}</ThemedText>
          </View>
        </View>
      </View>
      <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={styles.tiles}>
          {GUEST_ITEMS.map((item) => {
            const key = 'href' in item ? item.href : item.route;
            const unlocked = item.alwaysOn || hasContextAccess;
            return (
              <TouchableOpacity
                key={key}
                disabled={!unlocked}
                onPress={() => {
                  if ('href' in item) {
                    if (item.href === 'plan') {
                      router.push(`/(app)/stays/plan?estateId=${estateId}` as never);
                    } else {
                      router.push(`/(app)/stays?estateId=${estateId}` as never);
                    }
                    return;
                  }
                  router.push(`/(app)/estates/${estateId}/${item.route}` as never);
                }}
                style={[
                  styles.tile,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: unlocked ? 1 : 0.55,
                  },
                  Elevation.card[scheme],
                ]}
                activeOpacity={0.75}
              >
                <IconSymbol name={item.icon as never} size={28} color={colors.tint} />
                <ThemedText type="defaultSemiBold" style={styles.tileLabel}>
                  {item.label}
                </ThemedText>
                {!unlocked ? (
                  <ThemedText style={[styles.contextHint, { color: colors.icon }]}>
                    {contextUnlockLabel ?? 'Unlocks 3 days before your stay'}
                  </ThemedText>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
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
    paddingBottom: Layout.sectionGap - 8,
    gap: 8,
  },
  back: { padding: 4 },
  headerText: { flex: 1, minWidth: 0 },
  name: { fontSize: 22, fontFamily: Fonts.heading },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  guestBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm },
  guestBadgeText: { fontSize: 11, fontWeight: '700' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  location: { fontSize: 13 },
  editBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  grid: { paddingHorizontal: Layout.screenPaddingX, paddingTop: 8 },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '47%',
    flexGrow: 1,
    minHeight: 100,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  tileLabel: { fontSize: 15 },
  contextHint: { fontSize: 11, lineHeight: 14, marginTop: 2 },
});
