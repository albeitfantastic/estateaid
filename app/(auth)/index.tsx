import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authRedirectUri, ensureProfileRowForAuthUser, savePendingSignupProfile } from '@/lib/auth-linking';
import { loadAllStores } from '@/lib/load-all-stores';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import { useInvitationStore } from '@/store/invitation-store';
import { User, UserRole } from '@/types';

type Mode = 'signin' | 'signup';

export default function AuthScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { setUser, pendingInviteCode, setPendingInviteCode } = useAuthStore();
  const { redeemCode } = useInvitationStore();

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('owner');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) { Alert.alert('Sign in failed', error.message); return; }

      let { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();

      if (!profile) {
        const ensured = await ensureProfileRowForAuthUser(data.user);
        if (ensured.error) {
          Alert.alert('Profile setup failed', ensured.error);
          return;
        }
        profile = ensured.profile;
      }

      if (!profile) {
        Alert.alert('Profile not found', 'Could not create your profile. If this persists, check Supabase RLS policies for `profiles`.');
        return;
      }

      const user: User = {
        id: profile.id,
        name: profile.name,
        email: data.user.email!,
        avatarUrl: profile.avatar_url ?? undefined,
        role: profile.role,
        createdAt: profile.created_at,
      };
      setUser(user);
      await loadAllStores();

      if (pendingInviteCode && user.role === 'guest') {
        const r = await redeemCode(pendingInviteCode, user.id);
        setPendingInviteCode(null);
        if (!r.success) {
          Alert.alert(
            'Invite code',
            'We could not apply your invite code. Open Invitations and enter it again, or ask your host for a new code.'
          );
        }
      }

      router.replace(user.role === 'owner' ? '/(owner)/home' : '/(guest)/home' as never);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    if (!name || !email || !password) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: authRedirectUri,
          data: { name: name.trim(), role },
        },
      });
      if (error) { Alert.alert('Sign up failed', error.message); return; }
      if (!data.user) { Alert.alert('Sign up failed', 'Please try again.'); return; }

      // If email confirmation is enabled, session will be null
      if (!data.session) {
        await savePendingSignupProfile({
          userId: data.user.id,
          name: name.trim(),
          role,
        });
        Alert.alert(
          'Check your email',
          'We sent you a confirmation link. Open it on this device so the app can finish sign-up, or sign in after confirming.',
          [{ text: 'OK', onPress: () => setMode('signin') }]
        );
        return;
      }

      const now = new Date().toISOString();
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        name: name.trim(),
        role,
        created_at: now,
      });

      if (profileError) {
        Alert.alert('Profile setup failed', profileError.message);
        return;
      }

      const user: User = {
        id: data.user.id,
        name: name.trim(),
        email: data.user.email!,
        role,
        createdAt: now,
      };
      setUser(user);
      await loadAllStores();

      if (pendingInviteCode && role === 'guest') {
        const r = await redeemCode(pendingInviteCode, user.id);
        setPendingInviteCode(null);
        if (!r.success) {
          Alert.alert(
            'Invite code',
            'We could not apply your invite code. Open Invitations and enter it again, or ask your host for a new code.'
          );
        }
      }

      router.replace(role === 'owner' ? '/(owner)/home' : '/(guest)/home' as never);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 32 }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>EstateAid</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
            {mode === 'signin' ? 'Sign in to continue' : 'Create your account'}
          </ThemedText>
        </View>

        {/* Tab switcher */}
        <View style={[styles.tabs, { backgroundColor: colors.icon + '15', borderColor: colors.border }]}>
          {(['signin', 'signup'] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.tab, mode === m && { backgroundColor: colors.tint }]}
              onPress={() => setMode(m)}
              activeOpacity={0.8}
            >
              <ThemedText style={[styles.tabText, mode === m && { color: '#fff' }]}>
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.form}>
          {mode === 'signup' && (
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              placeholder="Full name"
              placeholderTextColor={colors.icon}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
            />
          )}
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
            placeholder="Email"
            placeholderTextColor={colors.icon}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
            placeholder="Password"
            placeholderTextColor={colors.icon}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />

          {mode === 'signup' && (
            <View style={styles.roleRow}>
              {(['owner', 'guest'] as UserRole[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.roleBtn,
                    { borderColor: role === r ? colors.tint : colors.border },
                    role === r && { backgroundColor: colors.tint + '15' },
                  ]}
                  onPress={() => setRole(r)}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.roleBtnText, role === r && { color: colors.tint, fontWeight: '700' }]}>
                    {r === 'owner' ? 'Property Owner' : 'Guest'}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.tint }, loading && { opacity: 0.7 }]}
            onPress={mode === 'signin' ? handleSignIn : handleSignUp}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <ThemedText style={styles.btnText}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</ThemedText>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  header: { marginBottom: 32 },
  title: { fontSize: 36, fontWeight: '700', letterSpacing: -1 },
  subtitle: { marginTop: 4, fontSize: 15 },
  tabs: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 4, marginBottom: 28 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  tabText: { fontWeight: '600', fontSize: 14 },
  form: { gap: 14 },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  roleBtnText: { fontSize: 14 },
  btn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
