import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEstateStore } from '@/store/estate-store';

const HUB_ITEMS = [
  { label: 'Request a Stay', icon: 'calendar', route: 'request-stay' },
  { label: 'My Stays', icon: 'checkmark.circle.fill', route: 'my-stays' },
  { label: 'FAQ', icon: 'questionmark.circle.fill', route: 'faq' },
  { label: 'Documents', icon: 'doc.fill', route: 'documents' },
  { label: 'Contacts', icon: 'phone.fill', route: 'contacts' },
  { label: 'My Tickets', icon: 'exclamationmark.triangle.fill', route: 'tickets' },
] as const;

export default function GuestEstateHub() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const estate = useEstateStore((s) => s.estates.find((e) => e.id === estateId));

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
          {HUB_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={[styles.tile, { backgroundColor: colors.tint + '11', borderColor: colors.tint + '22' }]}
              onPress={() => router.push(`/(guest)/estates/${estateId}/${item.route}` as never)}
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
});
