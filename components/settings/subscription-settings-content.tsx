import { Alert, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { loadAllStores } from '@/lib/load-all-stores';
import { supportMailto } from '@/lib/support';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';

export function SubscriptionSettingsContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const selectedTier = useAuthStore((s) => s.selectedTier);
  const patchUser = useAuthStore((s) => s.patchUser);

  const role = currentUser?.role;
  const isGuest = role === 'guest';
  const isOwner = role === 'owner' || role === 'admin';

  const planLine =
    isGuest
      ? 'Guest — free'
      : selectedTier === 'premium'
        ? 'Owner — Premium'
        : 'Owner — Starter';

  async function upgradeToOwner() {
    if (!currentUser) return;
    Alert.alert(
      'Become a host',
      'You will switch to an owner account and can add properties and invite guests.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            const { error } = await supabase.from('profiles').update({ role: 'owner' }).eq('id', currentUser.id);
            if (error) {
              Alert.alert('Could not upgrade', error.message);
              return;
            }
            patchUser({ role: 'owner' });
            await loadAllStores();
            router.replace('/(owner)/home' as never);
          },
        },
      ]
    );
  }

  function cancelSubscription() {
    if (selectedTier !== 'premium') {
      Alert.alert(
        'Cancel subscription',
        'You are not on a paid Premium plan in the app. There is nothing to cancel here yet.',
        [
          { text: 'OK' },
          {
            text: 'Contact support',
            onPress: () =>
              void Linking.openURL(supportMailto('Cancel subscription', 'Please help me cancel my subscription.')),
          },
        ]
      );
      return;
    }
    Alert.alert(
      'Cancel subscription',
      'Billing is not connected in this build. Contact support and we will help you cancel.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Contact support',
          onPress: () =>
            void Linking.openURL(supportMailto('Cancel Premium', 'I would like to cancel my Premium subscription.')),
        },
      ]
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.inner, { paddingBottom: insets.bottom + 24 }]}>
        <ThemedText style={[styles.sectionTitle, { color: colors.icon }]}>Current plan</ThemedText>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ThemedText type="defaultSemiBold" style={styles.planText}>
            {planLine}
          </ThemedText>
          {isOwner && (
            <ThemedText style={[styles.sub, { color: colors.icon }]}>
              {selectedTier === 'premium'
                ? 'Premium includes expanded limits when billing is enabled.'
                : 'Starter is the default owner plan.'}
            </ThemedText>
          )}
        </View>

        {isGuest && (
          <>
            <ThemedText style={[styles.sectionTitle, { color: colors.icon, marginTop: 24 }]}>Upgrade</ThemedText>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.tint }]}
              onPress={() => void upgradeToOwner()}
              activeOpacity={0.85}
            >
              <ThemedText style={styles.primaryBtnText}>Upgrade to owner</ThemedText>
            </TouchableOpacity>
            <ThemedText style={[styles.sub, { color: colors.icon, marginTop: 8 }]}>
              List properties and manage guest stays from the owner app.
            </ThemedText>
          </>
        )}

        <ThemedText style={[styles.sectionTitle, { color: colors.icon, marginTop: 28 }]}>Subscription</ThemedText>
        <TouchableOpacity
          style={[styles.outlineBtn, { borderColor: colors.error }]}
          onPress={cancelSubscription}
          activeOpacity={0.8}
        >
          <ThemedText style={{ color: colors.error, fontWeight: '600' }}>Cancel subscription</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { paddingHorizontal: 20, paddingTop: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16 },
  planText: { fontSize: 18 },
  sub: { fontSize: 14, marginTop: 8, lineHeight: 20 },
  primaryBtn: { marginTop: 4, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  outlineBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
});
