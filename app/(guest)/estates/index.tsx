import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemo } from 'react';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { EstateCard } from '@/components/ui/estate-card';
import { EmptyState } from '@/components/ui/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';

export default function GuestEstatesList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);

  const allInvitations = useInvitationStore((s) => s.invitations);
  const allEstates = useEstateStore((s) => s.estates);

  const acceptedEstates = useMemo(() => {
    const estateIds = allInvitations
      .filter(
        (inv) =>
          (inv.guestEmail === currentUser?.email || inv.guestId === currentUser?.id) &&
          inv.status === 'accepted'
      )
      .map((inv) => inv.estateId);
    return allEstates.filter((e) => estateIds.includes(e.id));
  }, [allInvitations, allEstates, currentUser?.email, currentUser?.id]);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>Properties</ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {acceptedEstates.length === 0 ? (
          <EmptyState
            icon="building.2.fill"
            title="No estates yet"
            subtitle="Accept an invitation from an owner to access their estate."
          />
        ) : (
          <View style={styles.list}>
            {acceptedEstates.map((estate) => (
              <EstateCard
                key={estate.id}
                estate={estate}
                onPress={() => router.push(`/(guest)/estates/${estate.id}` as never)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  back: { padding: 4 },
  title: { fontSize: 22, fontWeight: '700' },
  scroll: { paddingHorizontal: 20 },
  list: { gap: 0 },
});
