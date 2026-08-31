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
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { GoogleLogo } from '@/components/auth/google-logo';
import { ThemedText } from '@/components/themed-text';
import {
  GroupedList,
  OutlineButton,
  ScreenFootnote,
  ScreenScroll,
  ScreenShell,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import {
  authRedirectUri,
  ensureProfileRowForAuthUser,
  savePendingSignupProfile,
  signInWithOAuth,
  type ProfileRow,
} from '@/lib/auth-linking';
import { loadAllStores } from '@/lib/load-all-stores';
import { LEGAL_ROUTES } from '@/lib/legal-routes';
import { estateHrefAfterInviteAccept } from '@/lib/guest-landing';
import { supabase } from '@/lib/supabase';
import { isOnboardingCompleteForCurrentUser, useAuthStore } from '@/store/auth-store';
import { useInvitationStore } from '@/store/invitation-store';
import { User } from '@/types';

type Mode = 'signin' | 'signup';

interface FocusInputProps extends TextInputProps {
  label: string;
}

function FocusInput({ label, style, ...props }: FocusInputProps) {
  const { colors } = useScreenTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={fi.wrap}>
      <Text style={[fi.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[
          fi.input,
          {
            borderColor: focused ? colors.tint : colors.border,
            backgroundColor: colors.surface,
            color: colors.text,
            shadowColor: colors.tint,
            shadowOpacity: focused ? 0.14 : 0,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 5,
          },
          style,
        ]}
        placeholderTextColor={colors.textSecondary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
    </View>
  );
}

const fi = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'Inter_700Bold' },
  input: { height: 50, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 16, fontSize: 15, fontFamily: 'Manrope_400Regular' },
});

const { height: SCREEN_H } = Dimensions.get('window');

function AuthHeaderTitle() {
  const { t } = useTranslation();
  const { colors } = useScreenTheme();
  return (
    <View style={s.titleRow}>
      <View style={[s.logoMark, { backgroundColor: colors.surface }]}>
        <Image
          source={require('../../assets/images/logo_green.png')}
          style={s.logoMarkImage}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
      <ThemedText type="title" style={s.title}>
        {t('common.estateAid')}
      </ThemedText>
    </View>
  );
}

export default function AuthScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, cardShadow, radius } = useScreenTheme();
  const { setUser, resetOnboarding, pendingInviteCode, setPendingInviteCode, completeOnboarding, setSkipOnboardingForInvite } = useAuthStore();
  const { redeemCode } = useInvitationStore();

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingOAuth, setLoadingOAuth] = useState<'google' | 'apple' | null>(null);

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
        router.replace(estateHrefAfterInviteAccept(r.invitation) as never);
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

  async function handleSignIn() {
    if (!email || !password) { Alert.alert(t('auth.missingFieldsTitle'), t('auth.missingFieldsSignIn')); return; }
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
      if (!profile) { Alert.alert(t('auth.profileNotFound'), t('auth.profileNotFoundBody')); return; }
      await finishSignIn(profile, data.user.email!);
    } finally {
      setLoading(false);
    }
  }

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
      if (profileError) { Alert.alert(t('auth.profileSetupFailed'), profileError.message); return; }
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

  const anyLoading = loading || !!loadingOAuth;
  const oauthBg = colors.text;
  const oauthFg = colors.surface;

  return (
    <ScreenShell showBack={false} title={<AuthHeaderTitle />}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScreenScroll
          contentContainerStyle={[s.scroll, { minHeight: SCREEN_H * 0.75 }]}
          gap={16}
        >
          <ScreenFootnote style={s.subtitle}>
            {mode === 'signin' ? t('auth.welcomeBack') : t('auth.createAccount')}
          </ScreenFootnote>

          <View style={[s.tabs, { backgroundColor: colors.surfaceMuted }]}>
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  s.tab,
                  mode === m && {
                    backgroundColor: colors.tint,
                    shadowColor: colors.tint,
                    shadowOpacity: 0.22,
                    shadowOffset: { width: 0, height: 2 },
                    shadowRadius: 6,
                    elevation: 4,
                  },
                ]}
                onPress={() => { setMode(m); setShowEmailForm(false); }}
                activeOpacity={0.85}
              >
                <Text style={[s.tabText, { color: mode === m ? colors.textOnBrand : colors.textSecondary }]}>
                  {m === 'signin' ? t('auth.signIn') : t('auth.signUp')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <GroupedList style={cardShadow}>
            <TouchableOpacity
              style={[s.oauthBtn, { backgroundColor: oauthBg }]}
              onPress={() => void handleOAuth('google')}
              disabled={anyLoading}
              activeOpacity={0.85}
            >
              {loadingOAuth === 'google' ? (
                <View style={s.oauthLoading}>
                  <ActivityIndicator color={oauthFg} />
                </View>
              ) : (
                <>
                  <View style={s.oauthIconSlot}>
                    <View style={s.oauthGlyphBox}>
                      <GoogleLogo size={18} />
                    </View>
                  </View>
                  <Text style={[s.oauthText, s.oauthLabel, { color: oauthFg }]}>
                    {t('auth.continueGoogle')}
                  </Text>
                  <View style={s.oauthIconSlot} />
                </>
              )}
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[s.oauthBtn, { backgroundColor: oauthBg, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}
                onPress={() => void handleOAuth('apple')}
                disabled={anyLoading}
                activeOpacity={0.85}
              >
                {loadingOAuth === 'apple' ? (
                  <View style={s.oauthLoading}>
                    <ActivityIndicator color={oauthFg} />
                  </View>
                ) : (
                  <>
                    <View style={s.oauthIconSlot}>
                      <Ionicons name="logo-apple" size={18} color={oauthFg} />
                    </View>
                    <Text style={[s.oauthText, s.oauthLabel, { color: oauthFg }]}>
                      {t('auth.continueApple')}
                    </Text>
                    <View style={s.oauthIconSlot} />
                  </>
                )}
              </TouchableOpacity>
            )}
          </GroupedList>

          {!showEmailForm ? (
            <OutlineButton
              label={t('auth.continueEmail')}
              icon="envelope.fill"
              onPress={() => setShowEmailForm(true)}
            />
          ) : (
            <>
              <View style={s.divRow}>
                <View style={[s.divLine, { backgroundColor: colors.border }]} />
                <Text style={[s.divText, { color: colors.textSecondary }]}>{t('auth.orWithEmail')}</Text>
                <View style={[s.divLine, { backgroundColor: colors.border }]} />
              </View>

              <View style={s.fields}>
                {mode === 'signup' && (
                  <FocusInput
                    label={t('auth.fullName')}
                    placeholder={t('auth.placeholderName')}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoComplete="name"
                  />
                )}
                <FocusInput
                  label={t('auth.email')}
                  placeholder={t('auth.placeholderEmail')}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                <FocusInput
                  label={t('auth.password')}
                  placeholder={t('auth.placeholderPassword')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
              </View>
            </>
          )}

          {showEmailForm && (
            <TouchableOpacity
              style={[s.ctaWrap, cardShadow, anyLoading && { opacity: 0.7 }]}
              onPress={mode === 'signin' ? handleSignIn : handleSignUp}
              disabled={anyLoading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[colors.brownMid, colors.tint]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[s.cta, { borderRadius: radius.md }]}
              >
                {loading
                  ? <ActivityIndicator color={colors.textOnBrand} />
                  : (
                    <Text style={[s.ctaText, { color: colors.textOnBrand }]}>
                      {mode === 'signin' ? t('auth.signIn') : t('auth.createAccountCta')}
                    </Text>
                  )
                }
              </LinearGradient>
            </TouchableOpacity>
          )}

          {mode === 'signin' && (
            <ScreenFootnote>
              <Text style={{ color: colors.brownMid, fontWeight: '600', textAlign: 'center' }}>
                {t('auth.forgotPassword')}
              </Text>
            </ScreenFootnote>
          )}
          {mode === 'signup' && (
            <ScreenFootnote>
              <Text style={{ textAlign: 'center', color: colors.textSecondary }}>
                {t('auth.termsPrefix')}{' '}
                <Text
                  style={{ color: colors.brownMid }}
                  onPress={() => router.push(LEGAL_ROUTES.terms as never)}
                  accessibilityRole="link"
                >
                  {t('auth.terms')}
                </Text>
                {' '}
                {t('auth.and')}{' '}
                <Text
                  style={{ color: colors.brownMid }}
                  onPress={() => router.push(LEGAL_ROUTES.privacy as never)}
                  accessibilityRole="link"
                >
                  {t('auth.privacyLink')}
                </Text>
              </Text>
            </ScreenFootnote>
          )}
        </ScreenScroll>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  scroll: {
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  logoMark: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logoMarkImage: { width: 32, height: (32 * 3840) / 4960 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { marginLeft: 0, marginBottom: 4 },
  tabs: { flexDirection: 'row', borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 11, borderRadius: 8, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  oauthBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  oauthIconSlot: { width: 28, minHeight: 22, alignItems: 'center', justifyContent: 'center' },
  oauthGlyphBox: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  oauthLabel: { flex: 1, textAlign: 'center' },
  oauthLoading: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  oauthText: { fontSize: 14, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  divRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  divLine: { flex: 1, height: 1 },
  divText: { fontSize: 12, fontFamily: 'Inter_500Medium', letterSpacing: 0.5 },
  fields: { gap: 14 },
  ctaWrap: { borderRadius: 14, marginTop: 4 },
  cta: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  ctaText: { fontSize: 15, fontWeight: '700', fontFamily: 'Manrope_700Bold', letterSpacing: 0.3 },
});
