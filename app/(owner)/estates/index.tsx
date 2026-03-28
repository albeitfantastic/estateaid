import { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EstateCard } from '@/components/ui/estate-card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';

export default function OwnerEstates() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const estates = useMemo(
    () => allEstates.filter((e) => e.ownerId === (currentUser?.id ?? '')),
    [allEstates, currentUser?.id]
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <ThemedText type="title" style={styles.title}>My Estates</ThemedText>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.tint }]}
          onPress={() => router.push('/(owner)/estates/new' as never)}
          activeOpacity={0.8}
        >
          <IconSymbol name="plus" size={20} color="#fff" />
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
          {estates.map((estate) => (
            <EstateCard
              key={estate.id}
              estate={estate}
              onPress={() => router.push(`/(owner)/estates/${estate.id}` as never)}
            />
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { fontSize: 32, fontWeight: '700' },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: 20, paddingTop: 8 },
});
