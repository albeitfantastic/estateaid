import { Alert, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supportMailto } from '@/lib/support';
import { useAuthStore } from '@/store/auth-store';

export function AccountSettingsContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const signOut = useAuthStore((s) => s.signOut);
  const currentUser = useAuthStore((s) => s.currentUser);

  function requestDeleteAccount() {
    Alert.alert(
      'Delete account',
      'Account deletion is processed by support. We will sign you out after you send the request.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Email support',
          onPress: async () => {
            const subj = 'Delete my EstateAid account';
            const body = currentUser
              ? `Please delete my account.\n\nUser id: ${currentUser.id}\nEmail: ${currentUser.email}`
              : 'Please delete my account.';
            await Linking.openURL(supportMailto(subj, body));
            await signOut();
            router.replace('/(auth)' as never);
          },
        },
      ]
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.inner, { paddingBottom: insets.bottom + 24 }]}>
        <ThemedText style={[styles.copy, { color: colors.icon }]}>
          Manage your account and data. Deleting your account removes access to EstateAid; our team completes removal
          on the backend.
        </ThemedText>

        <TouchableOpacity
          style={[styles.dangerBtn, { borderColor: colors.error }]}
          onPress={requestDeleteAccount}
          activeOpacity={0.8}
        >
          <ThemedText style={{ color: colors.error, fontWeight: '700' }}>Delete account</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { paddingHorizontal: 20, paddingTop: 16 },
  copy: { fontSize: 15, lineHeight: 22, marginBottom: 24 },
  dangerBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
});
