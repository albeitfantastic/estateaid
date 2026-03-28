import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemo } from 'react';

import { EstateCard } from '@/components/ui/estate-card';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/section-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useStayStore } from '@/store/stay-store';
import { formatDateRange } from '@/lib/date-utils';

export default function GuestHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);

  const allInvitations = useInvitationStore((s) => s.invitations);
  const allEstates = useEstateStore((s) => s.estates);
  const allStays = useStayStore((s) => s.stays);

  const acceptedEstates = useMemo(() => {
    const estateIds = allInvitations
      .filter((inv) => inv.guestEmail === currentUser?.email && inv.status === 'accepted')
      .map((inv) => inv.estateId);
    return allEstates.filter((e) => estateIds.includes(e.id));
  }, [allInvitations, allEstates, currentUser?.email]);

  const stays = useMemo(
    () => allStays.filter((st) => st.guestId === currentUser?.id),
    [allStays, currentUser?.id]
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <ThemedText type="title" style={styles.greeting}>
          Hello, {currentUser?.name.split(' ')[0]}
        </ThemedText>
        <ThemedText style={[styles.sub, { color: colors.icon }]}>Welcome back</ThemedText>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>

        {/* Upcoming stays */}
        {stays.length > 0 && (
          <>
            <SectionHeader title="Upcoming Stays" />
            {stays.map((stay) => {
              const estate = allEstates.find((e) => e.id === stay.estateId);
              return (
                <TouchableOpacity
                  key={stay.id}
                  style={[styles.stayCard, { backgroundColor: colors.tint + '11', borderColor: colors.tint + '33' }]}
                  onPress={() => router.push(`/(guest)/estates/${stay.estateId}` as never)}
                  activeOpacity={0.8}
                >
                  <ThemedText type="defaultSemiBold">{estate?.name}</ThemedText>
                  <ThemedText style={[styles.dates, { color: colors.icon }]}>
                    {formatDateRange(stay.from, stay.to)}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Estates */}
        <SectionHeader title="My Estates" />
        {acceptedEstates.length === 0 ? (
          <EmptyState
            icon="building.2.fill"
            title="No estates yet"
            subtitle="Accept an invitation from an owner to access their estate."
          />
        ) : (
          <View style={styles.estates}>
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
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  greeting: { fontSize: 32, fontWeight: '700' },
  sub: { fontSize: 15, marginTop: 2 },
  scroll: { paddingHorizontal: 20 },
  stayCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 4,
  },
  dates: { fontSize: 13 },
  estates: { gap: 0 },
});
