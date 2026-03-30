import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as QueryParams from 'expo-auth-session/build/QueryParams';

import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types';

/**
 * signUp({ options: { emailRedirectTo: authRedirectUri } }) — this exact string must appear
 * in Supabase → Authentication → URL Configuration → Redirect URLs.
 *
 * Site URL: must NOT be empty. Use ONE URL (same as the redirect you use day-to-day in dev,
 * or your production https URL). Empty Site URL breaks email confirmation redirects.
 *
 * Redirect URLs: one entry per line, e.g.
 *   - exp://192.168.x.x:8081/--/auth/callback  (Expo Go — requires Expo Go installed)
 *   - estateaid://auth/callback                 (dev / prod builds with scheme from app.json)
 *
 * Optional: set EXPO_PUBLIC_AUTH_REDIRECT_URI in .env.local to force the exact string when
 * your LAN IP changes (and add the same string to Redirect URLs + Site URL in Supabase).
 */
function computeAuthRedirectUri(): string {
  const override = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI?.trim();
  if (override) return override;

  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return Linking.createURL('auth/callback');
  }

  return Linking.createURL('auth/callback', { scheme: 'estateaid' });
}

export const authRedirectUri = computeAuthRedirectUri();

const PENDING_PROFILE_KEY = '@estateaid/pending-signup-profile';
const OAUTH_ROLE_KEY = '@estateaid/oauth-pending-role';

export type PendingSignupProfile = {
  userId: string;
  name: string;
  role: UserRole;
};

export async function savePendingSignupProfile(pending: PendingSignupProfile) {
  await AsyncStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(pending));
}

export type ProfileRow = {
  id: string;
  name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
};

type AuthUserLike = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

function roleFromMetadata(meta: Record<string, unknown> | null | undefined): UserRole | null {
  const r = meta?.role;
  return r === 'owner' || r === 'guest' || r === 'admin' ? r : null;
}

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
          role: pending.role,
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
  const oauthRole = await AsyncStorage.getItem(OAUTH_ROLE_KEY);
  if (oauthRole) await AsyncStorage.removeItem(OAUTH_ROLE_KEY);
  const role = roleFromMetadata(meta) ?? (oauthRole as UserRole | null) ?? 'guest';
  const now = new Date().toISOString();
  const { error: insErr } = await supabase.from('profiles').insert({
    id: authUser.id,
    name,
    role,
    created_at: now,
  });
  if (insErr) {
    return { profile: null, error: insErr.message };
  }
  const { data: row } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
  return { profile: row as ProfileRow };
}

/** Initiates an OAuth sign-in with Google or Apple. Saves the selected role first so
 *  ensureProfileRowForAuthUser can assign it when creating a new profile row. */
export async function signInWithOAuth(
  provider: 'google' | 'apple',
  role: UserRole
): Promise<{ profile: ProfileRow | null; error?: string }> {
  await AsyncStorage.setItem(OAUTH_ROLE_KEY, role);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: authRedirectUri, skipBrowserRedirect: true },
  });
  if (error || !data.url) {
    await AsyncStorage.removeItem(OAUTH_ROLE_KEY);
    return { profile: null, error: error?.message ?? 'OAuth error' };
  }
  const result = await WebBrowser.openAuthSessionAsync(data.url, authRedirectUri);
  if (result.type !== 'success') {
    await AsyncStorage.removeItem(OAUTH_ROLE_KEY);
    return { profile: null, error: 'cancelled' };
  }
  const ok = await createSessionFromUrl(result.url);
  if (!ok) return { profile: null, error: 'Sign-in failed. Please try again.' };
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { profile: null, error: 'No session.' };
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
  return { profile: profile as ProfileRow };
}

/** Parses Supabase email-confirm / magic-link URL and restores the session. */
export async function createSessionFromUrl(url: string): Promise<boolean> {
  try {
    const { params, errorCode } = QueryParams.getQueryParams(url);
    if (errorCode) return false;

    if (params.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error) return false;
    } else if (params.access_token && params.refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (error) return false;
    } else {
      return false;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return false;

    await ensureProfileRowForAuthUser(session.user);
    return true;
  } catch {
    return false;
  }
}
