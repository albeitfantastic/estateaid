import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useStayStore } from '@/store/stay-store';
import { addDays, today } from '@/lib/date-utils';

const HUB_ITEMS = [
  { label: 'Plan a Stay', icon: 'calendar', route: 'request-stay', alwaysOn: true },
  { label: 'My Stays', icon: 'checkmark.circle.fill', route: 'my-stays', alwaysOn: true },
  { label: 'FAQ', icon: 'questionmark.circle.fill', route: 'faq', alwaysOn: false },
  { label: 'Documents', icon: 'doc.fill', route: 'documents', alwaysOn: false },
  { label: 'Contacts', icon: 'phone.fill', route: 'contacts', alwaysOn: false },
  { label: 'My Tickets', icon: 'exclamationmark.triangle.fill', route: 'tickets', alwaysOn: false },
] as const;

export default function GuestEstateHub() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const estate = useEstateStore((s) => s.estates.find((e) => e.id === estateId));
  const currentUser = useAuthStore((s) => s.currentUser);
  const allStays = useStayStore((s) => s.stays);
  const todayStr = today();

  const hasContextAccess = useMemo(() => {
    return allStays.some(
      (s) =>
        s.estateId === estateId &&
        s.guestId === currentUser?.id &&
        todayStr >= addDays(s.from, -3) &&
        todayStr <= addDays(s.to, 1)
    );
  }, [allStays, estateId, currentUser?.id, todayStr]);

  if (!estate) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>Estate not found.</ThemedText>
      </ThemedView>
    );
  }

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
      </View>

      <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 24 }]}>
        {estate.description && (
          <ThemedText style={[styles.description, { color: colors.icon }]}>
            {estate.description}
          </ThemedText>
        )}
        <View style={styles.tiles}>
          {HUB_ITEMS.map((item) => {
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
                <ThemedText
                  type="defaultSemiBold"
                  style={[styles.tileLabel, !unlocked && { color: colors.icon }]}
                >
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
  name: { fontSize: 22, fontWeight: '700' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { fontSize: 13 },
  grid: { paddingHorizontal: 20, paddingTop: 8 },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: '47%', padding: 20, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 10 },
  tileLabel: { fontSize: 14, textAlign: 'center' },
  tileLocked: { opacity: 0.38 },
  lockBadge: { position: 'absolute', bottom: 8, right: 8 },
  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 14, borderRadius: 12, marginTop: 16 },
  hintText: { flex: 1, fontSize: 12, lineHeight: 17 },
});
