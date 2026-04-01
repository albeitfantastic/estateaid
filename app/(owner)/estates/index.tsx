import { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EstateCard } from '@/components/ui/estate-card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { getEstateRole } from '@/lib/estate-role';
import { guestEmailsMatch } from '@/lib/invite-email';

export default function OwnerEstates() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const allInvitations = useInvitationStore((s) => s.invitations);

  const invitedEstateIds = useMemo(() => {
    if (!currentUser) return [] as string[];
    return allInvitations
      .filter(
        (inv) =>
          inv.status === 'accepted' &&
          (inv.guestId === currentUser.id || guestEmailsMatch(inv.guestEmail, currentUser.email))
      )
      .map((inv) => inv.estateId);
  }, [allInvitations, currentUser]);

  const estates = useMemo(
    () =>
      allEstates.filter(
        (e) => e.ownerId === (currentUser?.id ?? '') || invitedEstateIds.includes(e.id)
      ),
    [allEstates, currentUser?.id, invitedEstateIds]
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        
        <ThemedText type="title" style={styles.title}>{t('titles.properties')}</ThemedText>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.tint }]}
          onPress={() => router.push('/(owner)/estates/new' as never)}
          activeOpacity={0.8}
        >
          <IconSymbol name="plus" size={18} color="#fff" />
          <ThemedText style={styles.addBtnText}>Add New</ThemedText>
        </TouchableOpacity>
      </View>

      {estates.length === 0 ? (
        <EmptyState
          icon="building.2.fill"
          title="No estates yet"
          subtitle="Add your first vacation home to get started."
          actionLabel="Add Estate"
          onAction={() => router.push('/(owner)/estates/new' as never)}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {estates.map((estate) => {
            const isOwned = estate.ownerId === currentUser?.id;
            const invRole = isOwned
              ? null
              : getEstateRole(allInvitations, estate.id, currentUser!.id, currentUser?.email);
            return (
              <View key={estate.id}>
                <EstateCard
                  estate={estate}
                  onPress={() => router.push(`/(owner)/estates/${estate.id}` as never)}
                />
                {invRole && (
                  <View style={[styles.roleBadge, { backgroundColor: colors.icon + '15' }]}>
                    <ThemedText style={[styles.roleBadgeText, { color: colors.icon }]}>
                      Guest
                    </ThemedText>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  title: { flex: 1, fontSize: 28, fontWeight: '700' },
  container: { flex: 1 },
  saddBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',

  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
    shadowColor: '#5C3D2E', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 8, elevation: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, fontFamily: 'sans-serif' },
  back: { padding: 4 },
  list: { paddingHorizontal: 20, paddingTop: 8 },
  roleBadge: { alignSelf: 'flex-start', marginTop: -8, marginBottom: 8, marginLeft: 20, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  roleBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.0, fontFamily: 'sans-serif' },
});
