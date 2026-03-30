import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { authRedirectUri, ensureProfileRowForAuthUser, savePendingSignupProfile, signInWithOAuth } from '@/lib/auth-linking';
import { loadAllStores } from '@/lib/load-all-stores';
import { supabase } from '@/lib/supabase';
import { isOnboardingCompleteForCurrentUser, useAuthStore } from '@/store/auth-store';
import { useInvitationStore } from '@/store/invitation-store';
import { User, type UserRole } from '@/types';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ─── Palette ─────────────────────────────────────────────────────────────────
const A = {
  bg:         '#EDE8E0',
  bgDark:     '#1A1310',
  card:       '#F5F1EB',
  cardDark:   '#2A1F18',
  brown:      '#5C3D2E',
  brownMid:   '#A0785A',
  creamDark:  '#E2D9CC',
  creamDarkD: '#3A2A20',
  text:       '#2A1F18',
  textDark:   '#F0EBE3',
  textMuted:  '#8C7B6E',
  textMutedD: '#7A6558',
  white:      '#FDFAF7',
  whiteDark:  '#2E1F16',
  border:     '#D4C8BB',
  borderDark: '#4A3728',
};

type Mode = 'signin' | 'signup';

// ─── FocusInput ──────────────────────────────────────────────────────────────
interface FocusInputProps extends TextInputProps {
  label: string;
  dark: boolean;
}

function FocusInput({ label, dark, style, ...props }: FocusInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fi.wrap}>
      <Text style={[fi.label, { color: A.textMuted }]}>{label}</Text>
      <TextInput
        style={[
          fi.input,
          {
            borderColor: focused ? A.brown : (dark ? A.borderDark : A.border),
            backgroundColor: dark ? A.whiteDark : A.white,
            color: dark ? A.textDark : A.text,
            shadowColor: A.brown,
            shadowOpacity: focused ? 0.14 : 0,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 5,
          },
          style,
        ]}
        placeholderTextColor={A.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
    </View>
  );
}

const fi = StyleSheet.create({
  wrap:  { gap: 6 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'sans-serif' },
  input: { height: 50, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, fontSize: 15, fontFamily: 'sans-serif' },
});

// ─── Screen ──────────────────────────────────────────────────────────────────
const { height: SCREEN_H } = Dimensions.get('window');

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';
  const { setUser, resetOnboarding, pendingInviteCode, setPendingInviteCode } = useAuthStore();
  const { redeemCode } = useInvitationStore();

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingOAuth, setLoadingOAuth] = useState<'google' | 'apple' | null>(null);

  // ── helpers ────────────────────────────────────────────────────────────────
  async function finishSignIn(profile: { id: string; name: string; role: UserRole; avatar_url: string | null; created_at: string }, userEmail: string) {
    const user: User = {
      id: profile.id,
      name: profile.name,
      email: userEmail,
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
        Alert.alert('Invite code', 'We could not apply your invite code. Open Invitations and enter it again.');
      }
    }
    if (!isOnboardingCompleteForCurrentUser(useAuthStore.getState())) {
      router.replace('/(onboarding)/q1' as never);
      return;
    }
    router.replace(user.role === 'guest' ? '/(guest)/home' : '/(owner)/home' as never);
  }

  // ── sign in ────────────────────────────────────────────────────────────────
  async function handleSignIn() {
    if (!email || !password) { Alert.alert('Missing fields', 'Please enter your email and password.'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) { Alert.alert('Sign in failed', error.message); return; }
      let { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
      if (!profile) {
        const ensured = await ensureProfileRowForAuthUser(data.user);
        if (ensured.error) { Alert.alert('Profile setup failed', ensured.error); return; }
        profile = ensured.profile;
      }
      if (!profile) { Alert.alert('Profile not found', 'Could not create your profile.'); return; }
      await finishSignIn(profile, data.user.email!);
    } finally {
      setLoading(false);
    }
  }

  // ── sign up ────────────────────────────────────────────────────────────────
  async function handleSignUp() {
    if (!name || !email || !password) { Alert.alert('Missing fields', 'Please fill in all fields.'); return; }
    if (password.length < 6) { Alert.alert('Weak password', 'Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: authRedirectUri, data: { name: name.trim() } },
      });
      if (error) { Alert.alert('Sign up failed', error.message); return; }
      if (!data.user) { Alert.alert('Sign up failed', 'Please try again.'); return; }
      if (!data.session) {
        await savePendingSignupProfile({ userId: data.user.id, name: name.trim(), role: 'owner' });
        Alert.alert('Check your email', 'We sent you a confirmation link. Open it on this device to finish sign-up.', [{ text: 'OK', onPress: () => setMode('signin') }]);
        return;
      }
      const now = new Date().toISOString();
      const { error: profileError } = await supabase.from('profiles').insert({ id: data.user.id, name: name.trim(), role: 'owner', created_at: now });
      if (profileError) { Alert.alert('Profile setup failed', profileError.message); return; }
      resetOnboarding();
      setUser({ id: data.user.id, name: name.trim(), email: data.user.email!, role: 'owner', createdAt: now });
      router.replace('/(onboarding)/q1' as never);
    } finally {
      setLoading(false);
    }
  }

  // ── oauth ──────────────────────────────────────────────────────────────────
  async function handleOAuth(provider: 'google' | 'apple') {
    setLoadingOAuth(provider);
    try {
      const result = await signInWithOAuth(provider, 'owner');
      if (!result.profile) {
        if (result.error !== 'cancelled') Alert.alert('Sign-in failed', result.error ?? 'Please try again.');
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { Alert.alert('Sign-in failed', 'No session found.'); return; }
      await finishSignIn(result.profile, session.user.email!);
    } finally {
      setLoadingOAuth(null);
    }
  }

  // ── palette shortcuts ──────────────────────────────────────────────────────
  const bg        = dark ? A.bgDark       : A.bg;
  const cardBg    = dark ? A.cardDark     : A.card;
  const tabBg     = dark ? A.creamDarkD   : A.creamDark;
  const inputBg   = dark ? A.whiteDark    : A.white;
  const borderCol = dark ? A.borderDark   : A.border;
  const textCol   = dark ? A.textDark     : A.text;

  const anyLoading = loading || !!loadingOAuth;

  return (
    <View style={[s.screen, { backgroundColor: bg, paddingTop: insets.top }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[s.scroll, { minHeight: SCREEN_H - insets.top }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              s.card,
              {
                backgroundColor: cardBg,
                borderColor: dark ? A.borderDark : '#E2D9CC',
                shadowColor: '#2C1C12',
              },
            ]}
          >
            {/* ── Header ── */}
            <View style={s.header}>
              <View style={s.titleRow}>
                <View style={s.logoMark}>
                  <IconSymbol name="house.fill" size={16} color="#fff" />
                </View>
                <Text style={[s.title, { color: textCol }]}>EstateAid</Text>
              </View>
              <Text style={[s.subtitle, { color: A.textMuted }]}>
                {mode === 'signin' ? 'Welcome back' : 'Create your account'}
              </Text>
            </View>

            {/* ── Tab toggle ── */}
            <View style={[s.tabs, { backgroundColor: tabBg }]}>
              {(['signin', 'signup'] as Mode[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    s.tab,
                    mode === m && {
                      backgroundColor: A.brown,
                      shadowColor: A.brown,
                      shadowOpacity: 0.22,
                      shadowOffset: { width: 0, height: 2 },
                      shadowRadius: 6,
                      elevation: 4,
                    },
                  ]}
                  onPress={() => { setMode(m); setShowEmailForm(false); }}
                  activeOpacity={0.85}
                >
                  <Text style={[s.tabText, { color: mode === m ? '#fff' : A.textMuted }]}>
                    {m === 'signin' ? 'Sign In' : 'Sign Up'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── OAuth buttons ── */}
            <View style={s.oauthGroup}>
              <TouchableOpacity
                style={[s.oauthBtn, { backgroundColor: inputBg, borderColor: borderCol }]}
                onPress={() => void handleOAuth('google')}
                disabled={anyLoading}
                activeOpacity={0.8}
              >
                {loadingOAuth === 'google' ? (
                  <ActivityIndicator color={textCol} />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={18} color="#4285F4" />
                    <Text style={[s.oauthText, { color: textCol }]}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={[s.oauthBtn, { backgroundColor: dark ? '#FDFAF7' : A.text, borderColor: 'transparent' }]}
                  onPress={() => void handleOAuth('apple')}
                  disabled={anyLoading}
                  activeOpacity={0.85}
                >
                  {loadingOAuth === 'apple' ? (
                    <ActivityIndicator color={dark ? A.text : '#fff'} />
                  ) : (
                    <>
                      <Ionicons name="logo-apple" size={18} color={dark ? A.text : '#fff'} />
                      <Text style={[s.oauthText, { color: dark ? A.text : '#fff' }]}>Continue with Apple</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* ── Continue with E-mail ── */}
            {!showEmailForm ? (
              <TouchableOpacity
                style={[s.emailBtn, { borderColor: borderCol }]}
                onPress={() => setShowEmailForm(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="mail-outline" size={18} color={textCol} />
                <Text style={[s.emailBtnText, { color: textCol }]}>Continue with E-mail</Text>
              </TouchableOpacity>
            ) : (
              <>
                <View style={s.divRow}>
                  <View style={[s.divLine, { backgroundColor: borderCol }]} />
                  <Text style={[s.divText, { color: A.textMuted }]}>or with email</Text>
                  <View style={[s.divLine, { backgroundColor: borderCol }]} />
                </View>

                <View style={s.fields}>
                  {mode === 'signup' && (
                    <FocusInput
                      label="Full Name"
                      dark={dark}
                      placeholder="Jane Smith"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                      autoComplete="name"
                    />
                  )}
                  <FocusInput
                    label="Email"
                    dark={dark}
                    placeholder="you@example.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                  <FocusInput
                    label="Password"
                    dark={dark}
                    placeholder="••••••••"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                </View>
              </>
            )}

            {/* ── CTA ── */}
            {showEmailForm && <TouchableOpacity
              style={[s.ctaWrap, anyLoading && { opacity: 0.7 }]}
              onPress={mode === 'signin' ? handleSignIn : handleSignUp}
              disabled={anyLoading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#7A5548', '#5C3D2E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.cta}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.ctaText}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
                }
              </LinearGradient>
            </TouchableOpacity>}

            {/* ── Footer ── */}
            {mode === 'signin' && (
              <Text style={[s.footerText, { color: A.textMuted }]}>
                <Text style={{ color: A.brownMid, fontWeight: '600' }}>Forgot password?</Text>
              </Text>
            )}
            {mode === 'signup' && (
              <Text style={[s.footerText, { color: A.textMuted }]}>
                By creating an account you agree to our{' '}
                <Text style={{ color: A.brownMid }}>Terms</Text>
                {' '}and{' '}
                <Text style={{ color: A.brownMid }}>Privacy Policy</Text>
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  screen:    { flex: 1 },
  scroll:    { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  card: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 28,
    padding: 32,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 32,
    elevation: 8,
    gap: 0,
  },
  // header
  header:    { marginBottom: 28 },
  titleRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  logoMark:  { width: 32, height: 32, borderRadius: 9, backgroundColor: A.brown, alignItems: 'center', justifyContent: 'center' },
  title:     { fontSize: 26, fontWeight: '700', letterSpacing: -0.5, fontFamily: 'serif' },
  subtitle:  { fontSize: 14, marginLeft: 40, fontFamily: 'sans-serif' },
  // tabs
  tabs:      { flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: 24 },
  tab:       { flex: 1, paddingVertical: 11, borderRadius: 11, alignItems: 'center' },
  tabText:   { fontSize: 14, fontWeight: '600', fontFamily: 'sans-serif' },
  // oauth
  oauthGroup: { gap: 10, marginBottom: 20 },
  oauthBtn:  { height: 50, borderRadius: 14, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  oauthText: { fontSize: 14, fontWeight: '600', fontFamily: 'sans-serif' },
  // divider
  divRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  divLine:   { flex: 1, height: 1 },
  divText:   { fontSize: 12, fontFamily: 'sans-serif', letterSpacing: 0.5 },
  // fields
  fields:    { gap: 14, marginBottom: 20 },
  // email button
  emailBtn:  { height: 50, borderRadius: 14, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 },
  emailBtnText: { fontSize: 14, fontWeight: '600', fontFamily: 'sans-serif' },
  // cta
  ctaWrap:   { borderRadius: 14, shadowColor: '#5C3D2E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 6, marginBottom: 16 },
  cta:       { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ctaText:   { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'sans-serif', letterSpacing: 0.3 },
  // footer
  footerText: { textAlign: 'center', fontSize: 13, fontFamily: 'sans-serif', lineHeight: 20 },
});
