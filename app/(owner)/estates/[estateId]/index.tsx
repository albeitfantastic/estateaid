import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useStayStore } from '@/store/stay-store';
import { getEstateRole } from '@/lib/estate-role';
import { addDays, today } from '@/lib/date-utils';
import { useMemo } from 'react';

const OWNER_ITEMS = [
  { label: 'Guests', icon: 'person.2.fill', route: 'guests' },
  { label: 'Stay Requests', icon: 'calendar', route: 'stays' },
  { label: 'Availability', icon: 'calendar.badge.exclamationmark', route: 'availability' },
  { label: 'Events', icon: 'calendar.badge.clock', route: 'events' },
  { label: 'FAQ', icon: 'questionmark.circle.fill', route: 'faq' },
  { label: 'Documents', icon: 'doc.fill', route: 'documents' },
  { label: 'Contacts', icon: 'phone.fill', route: 'contacts' },
  { label: 'Tickets', icon: 'exclamationmark.triangle.fill', route: 'tickets' },
] as const;

const GUEST_ITEMS = [
  { label: 'Plan a Stay', icon: 'calendar', route: 'request-stay', alwaysOn: true },
  { label: 'My Stays', icon: 'checkmark.circle.fill', route: 'my-stays', alwaysOn: true },
  { label: 'FAQ', icon: 'questionmark.circle.fill', route: 'faq', alwaysOn: false },
  { label: 'Documents', icon: 'doc.fill', route: 'documents', alwaysOn: false },
  { label: 'Contacts', icon: 'phone.fill', route: 'contacts', alwaysOn: false },
  { label: 'My Tickets', icon: 'exclamationmark.triangle.fill', route: 'tickets', alwaysOn: false },
] as const;

export default function EstateHub() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const estate = useEstateStore((s) => s.estates.find((e) => e.id === estateId));
  const currentUser = useAuthStore((s) => s.currentUser);
  const allInvitations = useInvitationStore((s) => s.invitations);
  const allStays = useStayStore((s) => s.stays);
  const todayStr = today();

  const isEstateOwner = estate?.ownerId === currentUser?.id;
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

  // Owner: full control
  if (estateRole === 'owner') {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
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
          <TouchableOpacity onPress={() => router.push(`/(owner)/estates/${estateId}/edit` as never)}>
            <IconSymbol name="pencil" size={20} color={colors.tint} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 24 }]}>
          {estate.description && (
            <ThemedText style={[styles.description, { color: colors.icon }]}>{estate.description}</ThemedText>
          )}
          <View style={styles.tiles}>
            {OWNER_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.route}
                style={[styles.tile, { backgroundColor: colors.tint + '11', borderColor: colors.tint + '22' }]}
                onPress={() => router.push(`/(owner)/estates/${estateId}/${item.route}` as never)}
                activeOpacity={0.75}
              >
                <IconSymbol name={item.icon} size={28} color={colors.tint} />
                <ThemedText type="defaultSemiBold" style={styles.tileLabel}>{item.label}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  // Guest (owner invited to another owner's estate): time-gated tiles
  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
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
      <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 24 }]}>
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
                  router.push(`/(guest)/estates/${estateId}/${item.route}` as never);
                }}
                activeOpacity={unlocked ? 0.75 : 1}
              >
                <IconSymbol name={item.icon} size={28} color={unlocked ? colors.tint : colors.icon} />
                <ThemedText type="defaultSemiBold" style={[styles.tileLabel, !unlocked && { color: colors.icon }]}>
                  {item.label}
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
          <View style={[styles.hint, { backgroundColor: colors.icon + '0E' }]}>
            <IconSymbol name="lock.fill" size={13} color={colors.icon} />
            <ThemedText style={[styles.hintText, { color: colors.icon }]}>
              FAQ, Documents, Contacts and Tickets unlock 3 days before your stay.
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  back: { padding: 4 },
  headerText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 22, fontWeight: '700', flexShrink: 1 },
  adminBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  adminBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { fontSize: 13 },
  grid: { paddingHorizontal: 20, paddingTop: 8 },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '47%', padding: 20, borderRadius: 18, borderWidth: 1, alignItems: 'center', gap: 10,
    shadowColor: '#2A1F18', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  tileLabel: { fontSize: 14, textAlign: 'center', fontFamily: 'sans-serif', fontWeight: '500' },
  tileLocked: { opacity: 0.38 },
  lockBadge: { position: 'absolute', bottom: 8, right: 8 },
  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 14, borderRadius: 14, marginTop: 16 },
  hintText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: 'sans-serif' },
});
