import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useInvitationStore } from '@/store/invitation-store';
import { SEED_USERS } from '@/store/seed-data';
import { User } from '@/types';

export default function AuthScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { setUser, pendingInviteCode, setPendingInviteCode } = useAuthStore();
  const { redeemCode } = useInvitationStore();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  function signIn(user: User) {
    setUser(user);
    if (pendingInviteCode && user.role === 'guest') {
      redeemCode(pendingInviteCode, user.id);
      setPendingInviteCode(null);
    }
    if (user.role === 'owner') {
      router.replace('/(owner)/dashboard' as never);
    } else {
      router.replace('/(guest)/home' as never);
    }
  }

  const owners = SEED_USERS.filter((u) => u.role === 'owner');
  const guests = SEED_USERS.filter((u) => u.role === 'guest');

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 32 }]}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>EstateAid</ThemedText>
        <ThemedText type="subtitle" style={styles.subtitle}>
          Sign in to continue
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>Owners</ThemedText>
        {owners.map((user) => (
          <TouchableOpacity
            key={user.id}
            style={[styles.card, { borderColor: colors.tint, backgroundColor: colors.background }]}
            onPress={() => signIn(user)}
            activeOpacity={0.75}
          >
            <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
              <ThemedText style={styles.avatarText}>
                {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </ThemedText>
            </View>
            <View style={styles.info}>
              <ThemedText type="defaultSemiBold">{user.name}</ThemedText>
              <ThemedText style={[styles.email, { color: colors.icon }]}>{user.email}</ThemedText>
            </View>
            <View style={[styles.rolePill, { backgroundColor: colors.tint }]}>
              <ThemedText style={styles.roleText}>Owner</ThemedText>
            </View>
          </TouchableOpacity>
        ))}

        <ThemedText type="defaultSemiBold" style={[styles.sectionLabel, { marginTop: 24 }]}>
          Guests
        </ThemedText>
        {guests.map((user) => (
          <TouchableOpacity
            key={user.id}
            style={[styles.card, { borderColor: colors.icon, backgroundColor: colors.background }]}
            onPress={() => signIn(user)}
            activeOpacity={0.75}
          >
            <View style={[styles.avatar, { backgroundColor: '#687076' }]}>
              <ThemedText style={styles.avatarText}>
                {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </ThemedText>
            </View>
            <View style={styles.info}>
              <ThemedText type="defaultSemiBold">{user.name}</ThemedText>
              <ThemedText style={[styles.email, { color: colors.icon }]}>{user.email}</ThemedText>
            </View>
            <View style={[styles.rolePill, { backgroundColor: '#687076' }]}>
              <ThemedText style={styles.roleText}>Guest</ThemedText>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 4,
    opacity: 0.6,
  },
  scroll: {
    paddingBottom: 40,
  },
  sectionLabel: {
    marginBottom: 12,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1,
    opacity: 0.5,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  email: {
    fontSize: 13,
  },
  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
