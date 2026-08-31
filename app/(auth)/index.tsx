import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
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

import { GoogleLogo } from '@/components/auth/google-logo';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/useAppTheme';
import {
  authRedirectUri,
  ensureProfileRowForAuthUser,
  savePendingSignupProfile,
  signInWithOAuth,
  type ProfileRow,
} from '@/lib/auth-linking';
import { loadAllStores } from '@/lib/load-all-stores';
import { supabase } from '@/lib/supabase';
import { isOnboardingCompleteForCurrentUser, useAuthStore } from '@/store/auth-store';
import { useInvitationStore } from '@/store/invitation-store';
import { User } from '@/types';
import { useTranslation } from 'react-i18next';

// ─── Palette ─────────────────────────────────────────────────────────────────
const A = {
  bg:         '#F6F4EF',
  bgDark:     '#131210',
  card:       '#FFFCF9',
  cardDark:   '#1F1D1A',
  brown:      '#234536',
  brownMid:   '#3D4A44',
  creamDark:  '#262422',
  creamDarkD: '#2C302E',
  text:       '#252220',
  textDark:   '#F4F1EB',
  textMuted:  '#6E6862',
  textMutedD: '#9C9690',
  white:      '#FFFCF9',
  whiteDark:  '#1F1D1A',
  border:     '#DED9D0',
  borderDark: '#3A3632',
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
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'Inter_700Bold' },
  input: { height: 50, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 16, fontSize: 15, fontFamily: 'Manrope_400Regular' },
});

// ─── Screen ──────────────────────────────────────────────────────────────────
const { height: SCREEN_H } = Dimensions.get('window');

export default function AuthScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const appTheme = useAppTheme();
  const dark = colorScheme === 'dark';
  const { setUser, resetOnboarding, pendingInviteCode, setPendingInviteCode, completeOnboarding, setSkipOnboardingForInvite } = useAuthStore();
  const { redeemCode } = useInvitationStore();

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingOAuth, setLoadingOAuth] = useState<'google' | 'apple' | null>(null);

  // ── helpers ────────────────────────────────────────────────────────────────
  async function finishSignIn(profile: ProfileRow, userEmail: string) {
    const user: User = {
      id: profile.id,
      name: profile.name,
      email: userEmail,
      avatarUrl: profile.avatar_url ?? undefined,
      createdAt: profile.created_at,
      trialEndsAt: profile.trial_ends_at ?? null,
      trialStartedAt: profile.trial_started_at ?? null,
    };
    setUser(user);
    await loadAllStores();
    const skipInvite = useAuthStore.getState().skipOnboardingForInvite;
    const code = pendingInviteCode ?? useAuthStore.getState().pendingInviteCode;
    if (code) {
      const r = await redeemCode(code, user.id);
      setPendingInviteCode(null);
      if (r.success && r.invitation) {
        completeOnboarding();
        setSkipOnboardingForInvite(false);
        router.replace(`/(app)/estates/${r.invitation.estateId}` as never);
        return;
      }
      if (!r.success) {
        const msg =
          r.reason === 'wrong_invitee'
            ? t('auth.inviteWrongEmail')
            : r.reason === 'no_session_email'
              ? t('auth.inviteNoSessionEmail')
              : r.reason === 'invite_missing_email'
                ? t('auth.inviteOutdated')
                : t('auth.inviteGenericFail');
        Alert.alert(t('auth.inviteCodeTitle'), msg);
      }
    }
    if (skipInvite) {
      completeOnboarding();
      setSkipOnboardingForInvite(false);
      router.replace('/(app)/home' as never);
      return;
    }
    if (!isOnboardingCompleteForCurrentUser(useAuthStore.getState())) {
      router.replace('/(onboarding)/q1' as never);
      return;
    }
    router.replace('/(app)/home' as never);
  }

  // ── sign in ────────────────────────────────────────────────────────────────
  async function handleSignIn() {
    if (!email || !password) { Alert.alert('Missing fields', 'Please enter your email and password.'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        Alert.alert(t('auth.signInFailed'), error.message);
        return;
      }
      let { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
      if (!profile) {
        const ensured = await ensureProfileRowForAuthUser(data.user);
        if (ensured.error) {
          Alert.alert(t('auth.profileSetupFailed'), ensured.error);
          return;
        }
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
    if (!name || !email || !password) {
      Alert.alert(t('auth.missingFieldsTitle'), t('auth.missingFieldsSignUp'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('auth.weakPasswordTitle'), t('auth.weakPassword'));
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: authRedirectUri, data: { name: name.trim() } },
      });
      if (error) {
        Alert.alert(t('auth.signUpFailed'), error.message);
        return;
      }
      if (!data.user) {
        Alert.alert(t('auth.signUpFailed'), t('auth.tryAgain'));
        return;
      }
      if (!data.session) {
        await savePendingSignupProfile({ userId: data.user.id, name: name.trim() });
        Alert.alert(t('auth.checkEmailTitle'), t('auth.checkEmailBody'), [
          { text: t('common.ok'), onPress: () => setMode('signin') },
        ]);
        return;
      }
      const now = new Date().toISOString();
      const { error: profileError } = await supabase.from('profiles').insert({ id: data.user.id, name: name.trim(), created_at: now });
      if (profileError) { Alert.alert('Profile setup failed', profileError.message); return; }
      resetOnboarding();
      setUser({
        id: data.user.id,
        name: name.trim(),
        email: data.user.email!,
        createdAt: now,
        trialEndsAt: null,
        trialStartedAt: null,
      });
      router.replace('/(onboarding)/q1' as never);
    } finally {
      setLoading(false);
    }
  }

  // ── oauth ──────────────────────────────────────────────────────────────────
  async function handleOAuth(provider: 'google' | 'apple') {
    setLoadingOAuth(provider);
    try {
      const result = await signInWithOAuth(provider);
      if (!result.profile) {
        if (result.error !== 'cancelled')
          Alert.alert(t('auth.signInFailedGeneric'), result.error ?? t('auth.tryAgain'));
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert(t('auth.signInFailedGeneric'), t('auth.noSession'));
        return;
      }
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
              { backgroundColor: cardBg, borderColor: appTheme.colors.border },
              appTheme.shadows.md,
            ]}
          >
            {/* ── Header ── */}
            <View style={s.header}>
              <View style={s.titleRow}>
                <View style={[s.logoMark, { backgroundColor: cardBg }]}>
                  <Image
                    source={require('../../assets/images/logo_green.png')}
                    style={s.logoMarkImage}
                    resizeMode="contain"
                    accessibilityIgnoresInvertColors
                  />
                </View>
                <Text style={[s.title, { color: textCol }]}>{t('common.estateAid')}</Text>
              </View>
              <Text style={[s.subtitle, { color: A.textMuted }]}>
                {mode === 'signin' ? t('auth.welcomeBack') : t('auth.createAccount')}
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
                    {m === 'signin' ? t('auth.signIn') : t('auth.signUp')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── OAuth buttons ── */}
            <View style={s.oauthGroup}>
              <TouchableOpacity
                style={[s.oauthBtn, { backgroundColor: dark ? '#FDFAF7' : A.text, borderColor: 'transparent' }]}
                onPress={() => void handleOAuth('google')}
                disabled={anyLoading}
                activeOpacity={0.85}
              >
                {loadingOAuth === 'google' ? (
                  <View style={s.oauthLoading}>
                    <ActivityIndicator color={textCol} />
                  </View>
                ) : (
                  <>
                    <View style={s.oauthIconSlot}>
                      <View style={s.oauthGlyphBox}>
                        <GoogleLogo size={18} />
                      </View>
                    </View>
                    <Text style={[s.oauthText, s.oauthLabel, { color: dark ? A.text : '#fff' }]}>
                      {t('auth.continueGoogle')}
                    </Text>
                    <View style={s.oauthIconSlot} />
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
                    <View style={s.oauthLoading}>
                      <ActivityIndicator color={dark ? A.text : '#fff'} />
                    </View>
                  ) : (
                    <>
                      <View style={s.oauthIconSlot}>
                        <Ionicons name="logo-apple" size={18} color={dark ? A.text : '#fff'} />
                      </View>
                      <Text style={[s.oauthText, s.oauthLabel, { color: dark ? A.text : '#fff' }]}>
                        {t('auth.continueApple')}
                      </Text>
                      <View style={s.oauthIconSlot} />
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
                <Text style={[s.emailBtnText, { color: textCol }]}>{t('auth.continueEmail')}</Text>
              </TouchableOpacity>
            ) : (
              <>
                <View style={s.divRow}>
                  <View style={[s.divLine, { backgroundColor: borderCol }]} />
                  <Text style={[s.divText, { color: A.textMuted }]}>{t('auth.orWithEmail')}</Text>
                  <View style={[s.divLine, { backgroundColor: borderCol }]} />
                </View>

                <View style={s.fields}>
                  {mode === 'signup' && (
                    <FocusInput
                      label={t('auth.fullName')}
                      dark={dark}
                      placeholder={t('auth.placeholderName')}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                      autoComplete="name"
                    />
                  )}
                  <FocusInput
                    label={t('auth.email')}
                    dark={dark}
                    placeholder={t('auth.placeholderEmail')}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                  <FocusInput
                    label={t('auth.password')}
                    dark={dark}
                    placeholder={t('auth.placeholderPassword')}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                </View>
              </>
            )}

            {/* ── CTA ── */}
            {showEmailForm && (
            <TouchableOpacity
              style={[s.ctaWrap, appTheme.shadows.md, anyLoading && { opacity: 0.7 }]}
              onPress={mode === 'signin' ? handleSignIn : handleSignUp}
              disabled={anyLoading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#2F5349', '#234536']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.cta}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : (
                    <Text style={s.ctaText}>
                      {mode === 'signin' ? t('auth.signIn') : t('auth.createAccountCta')}
                    </Text>
                  )
                }
              </LinearGradient>
            </TouchableOpacity>
            )}

            {/* ── Footer ── */}
            {mode === 'signin' && (
              <Text style={[s.footerText, { color: A.textMuted }]}>
                <Text style={{ color: A.brownMid, fontWeight: '600' }}>{t('auth.forgotPassword')}</Text>
              </Text>
            )}
            {mode === 'signup' && (
              <Text style={[s.footerText, { color: A.textMuted }]}>
                {t('auth.termsPrefix')}{' '}
                <Text style={{ color: A.brownMid }}>{t('auth.terms')}</Text>
                {' '}
                {t('auth.and')}{' '}
                <Text style={{ color: A.brownMid }}>{t('auth.privacyLink')}</Text>
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
  scroll: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.section + 12,
    paddingHorizontal: spacing.screen,
  },
  card: {
    width: '100%',
    maxWidth: 390,
    borderRadius: radius.lg,
    padding: spacing.section + 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 0,
  },
  // header
  header:    { marginBottom: 28 },
  titleRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  logoMark:  { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  /** Same raster as splash (`logo_green.svg` → `assets/images/logo_green.png`), viewBox 4960×3840 */
  logoMarkImage: { width: 44, height: (44 * 3840) / 4960 },
  title:     { fontSize: 26, fontWeight: '700', letterSpacing: -0.5, fontFamily: 'Manrope_700Bold' },
  subtitle:  { fontSize: 14, marginLeft: 72, fontFamily: 'Manrope_400Regular' },
  // tabs
  tabs:      { flexDirection: 'row', borderRadius: 10, padding: 4, marginBottom: 24 },
  tab:       { flex: 1, paddingVertical: 11, borderRadius: 8, alignItems: 'center' },
  tabText:   { fontSize: 14, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  // oauth
  oauthGroup: { gap: 10, marginBottom: spacing.xxl },
  oauthBtn: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 14,
  },
  /** Same width on Google + Apple so logos share one vertical axis; right slot balances label centering. */
  oauthIconSlot: {
    width: 28,
    minHeight: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Locks Google PNG + Apple glyph to the same box so their centers line up in the rail. */
  oauthGlyphBox: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oauthLabel: { flex: 1, textAlign: 'center' },
  oauthLoading: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  oauthText: { fontSize: 14, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  // divider
  divRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  divLine:   { flex: 1, height: 1 },
  divText:   { fontSize: 12, fontFamily: 'Inter_500Medium', letterSpacing: 0.5 },
  // fields
  fields:    { gap: 14, marginBottom: 20 },
  // email button
  emailBtn:  { height: 50, borderRadius: 10, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 },
  emailBtnText: { fontSize: 14, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  // cta
  ctaWrap:   { borderRadius: radius.md, marginBottom: spacing.section - 4 },
  cta:       { minHeight: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  ctaText:   { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'Manrope_700Bold', letterSpacing: 0.3 },
  // footer
  footerText: { textAlign: 'center', fontSize: 13, fontFamily: 'Manrope_400Regular', lineHeight: 20 },
});
