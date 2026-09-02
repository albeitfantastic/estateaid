import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as QueryParams from 'expo-auth-session/build/QueryParams';

import { supabase } from '@/lib/supabase';

/**
 * signUp({ options: { emailRedirectTo: authRedirectUri } }) — this exact string must appear
 * in Supabase → Authentication → URL Configuration → Redirect URLs.
 *
 * Site URL: must NOT be empty. Use ONE URL (same as the redirect you use day-to-day in dev,
 * or your production https URL). Empty Site URL breaks email confirmation redirects.
 *
 * Redirect URLs: one entry per line, e.g.
 *   - exp://192.168.x.x:8081/--/auth/callback  (Expo Go — requires Expo Go installed)
 *   - maison://auth/callback                    (dev / prod builds with scheme from app.json)
 *
 * Optional: set EXPO_PUBLIC_AUTH_REDIRECT_URI in .env.local to force the exact string when
 * your LAN IP changes (and add the same string to Redirect URLs + Site URL in Supabase).
 */
function appScheme(): string {
  const s = Constants.expoConfig?.scheme;
  if (typeof s === 'string' && s) return s;
  if (Array.isArray(s) && typeof s[0] === 'string' && s[0]) return s[0];
  return 'maison';
}

function computeAuthRedirectUri(): string {
  const override = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI?.trim();
  if (override) return override;

  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return Linking.createURL('auth/callback');
  }

  return Linking.createURL('auth/callback', { scheme: appScheme() });
}

export const authRedirectUri = computeAuthRedirectUri();

const PENDING_PROFILE_KEY = '@maison/pending-signup-profile';

export type PendingSignupProfile = {
  userId: string;
  name: string;
};

export async function savePendingSignupProfile(pending: PendingSignupProfile) {
  await AsyncStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(pending));
}

export type ProfileRow = {
  id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
};

type AuthUserLike = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

function nameFromMetadata(meta: Record<string, unknown> | null | undefined): string | null {
  const n = meta?.name;
  return typeof n === 'string' && n.trim() ? n.trim() : null;
}

/**
 * Ensures a `profiles` row exists after auth. Order: existing row → pending signup on device →
 * auth user_metadata (set via signUp `options.data`) → safe fallbacks.
 */
export async function ensureProfileRowForAuthUser(
  authUser: AuthUserLike
): Promise<{ profile: ProfileRow | null; error?: string }> {
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (existing) {
    return { profile: existing as ProfileRow };
  }

  const raw = await AsyncStorage.getItem(PENDING_PROFILE_KEY);
  if (raw) {
    try {
      const pending = JSON.parse(raw) as PendingSignupProfile;
      if (pending.userId === authUser.id) {
        const now = new Date().toISOString();
        const { error: insErr } = await supabase.from('profiles').insert({
          id: authUser.id,
          name: pending.name,
          created_at: now,
        });
        if (!insErr) {
          await AsyncStorage.removeItem(PENDING_PROFILE_KEY);
          const { data: row } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
          return { profile: row as ProfileRow };
        }
        return { profile: null, error: insErr.message };
      }
    } catch {
      /* ignore malformed pending */
    }
  }

  const meta = authUser.user_metadata ?? undefined;
  const name = nameFromMetadata(meta) ?? authUser.email?.split('@')[0] ?? 'User';
  const now = new Date().toISOString();
  const { error: insErr } = await supabase.from('profiles').insert({
    id: authUser.id,
    name,
    created_at: now,
  });
  if (insErr) {
    return { profile: null, error: insErr.message };
  }
  const { data: row } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
  return { profile: row as ProfileRow };
}

export type CreateSessionFromUrlResult =
  | { ok: true }
  | { ok: false; stage: 'url' | 'exchange' | 'session' | 'profile'; detail?: string };

/** OAuth sign-in with Google or Apple (single account model). */
export async function signInWithOAuth(
  provider: 'google' | 'apple'
): Promise<{ profile: ProfileRow | null; error?: string }> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: authRedirectUri, skipBrowserRedirect: true },
  });
  if (error || !data.url) {
    return { profile: null, error: error?.message ?? 'OAuth error' };
  }
  const result = await WebBrowser.openAuthSessionAsync(data.url, authRedirectUri);
  if (result.type !== 'success') {
    return { profile: null, error: 'cancelled' };
  }
  const sessionResult = await createSessionFromUrl(result.url);
  if (!sessionResult.ok) {
    const msg =
      sessionResult.detail?.trim() ||
      (sessionResult.stage === 'profile'
        ? 'Could not create or load your profile.'
        : 'Sign-in failed. Please try again.');
    return { profile: null, error: msg };
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { profile: null, error: 'No session.' };

  let { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();

  if (!profile) {
    const ensured = await ensureProfileRowForAuthUser(session.user);
    if (ensured.profile) {
      profile = ensured.profile;
    } else {
      return {
        profile: null,
        error:
          ensured.error ??
          profileErr?.message ??
          'Could not create or load your profile.',
      };
    }
  }

  return { profile: profile as ProfileRow };
}

/** Parses Supabase email-confirm / magic-link URL and restores the session. */
export async function createSessionFromUrl(url: string): Promise<CreateSessionFromUrlResult> {
  try {
    const { params, errorCode } = QueryParams.getQueryParams(url);
    if (errorCode) return { ok: false, stage: 'url' };

    if (params.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error) return { ok: false, stage: 'exchange', detail: error.message };
    } else if (params.access_token && params.refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (error) return { ok: false, stage: 'exchange', detail: error.message };
    } else {
      return { ok: false, stage: 'url' };
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return { ok: false, stage: 'session' };

    const ensured = await ensureProfileRowForAuthUser(session.user);
    if (!ensured.profile) {
      return { ok: false, stage: 'profile', detail: ensured.error };
    }
    return { ok: true };
  } catch {
    return { ok: false, stage: 'exchange' };
  }
}
