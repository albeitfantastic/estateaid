import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts, Layout, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import { useInvitationStore } from '@/store/invitation-store';

type InvitePreview = {
  estateName: string;
  location: string | null;
  inviterName: string | null;
};

/** Deep link: https://estateaid.app/i/CODE or estateaid://i/CODE */
export default function InviteDeepLink() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const c = typeof code === 'string' ? code.trim().toUpperCase() : '';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];

  const currentUser = useAuthStore((s) => s.currentUser);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const setPendingInviteCode = useAuthStore((s) => s.setPendingInviteCode);
  const setSkipOnboardingForInvite = useAuthStore((s) => s.setSkipOnboardingForInvite);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const redeemCode = useInvitationStore((s) => s.redeemCode);

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [previewTried, setPreviewTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!c) {
      setPreviewTried(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { data: inv } = await supabase
          .from('invitations')
          .select('estate_id, owner_id, status')
          .eq('invite_code', c)
          .eq('status', 'pending')
          .maybeSingle();
        if (cancelled || !inv) {
          setPreviewTried(true);
          return;
        }
        const estateId = inv.estate_id as string;
        const ownerId = inv.owner_id as string;
        const [{ data: estate }, { data: profile }] = await Promise.all([
          supabase.from('estates').select('name, location').eq('id', estateId).maybeSingle(),
          supabase.from('profiles').select('name').eq('id', ownerId).maybeSingle(),
        ]);
        if (cancelled) return;
        if (estate?.name) {
          setPreview({
            estateName: estate.name as string,
            location: (estate.location as string | null) ?? null,
            inviterName: (profile?.name as string | null) ?? null,
          });
        }
      } catch {
        /* RLS may block anonymous preview — fall back to placeholder */
      } finally {
        if (!cancelled) setPreviewTried(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [c]);

  useEffect(() => {
    if (!isHydrated || !currentUser || !c) return;
    let cancelled = false;
    setBusy(true);
    void (async () => {
      const r = await redeemCode(c, currentUser.id);
      if (cancelled) return;
      if (r.success && r.invitation) {
        completeOnboarding();
        setSkipOnboardingForInvite(false);
        setPendingInviteCode(null);
        router.replace(`/(app)/estates/${r.invitation.estateId}` as never);
        return;
      }
      setError('Could not accept this invite. It may be used or invalid.');
      setBusy(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isHydrated, currentUser?.id, c]);

  function onSignUpToAccept() {
    if (!c) return;
    setPendingInviteCode(c);
    setSkipOnboardingForInvite(true);
    router.replace('/(auth)' as never);
  }

  if (!c) {
    return (
      <ThemedView style={[styles.center, { paddingTop: insets.top }]}>
        <ThemedText>Invalid invite link.</ThemedText>
        <TouchableOpacity onPress={() => router.replace('/' as never)} style={styles.linkBtn}>
          <ThemedText style={{ color: colors.tint }}>Go home</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  if (!isHydrated || (currentUser && busy && !error)) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={colors.tint} />
        <ThemedText style={[styles.muted, { color: colors.icon }]}>Opening invite…</ThemedText>
      </ThemedView>
    );
  }

  if (currentUser && error) {
    return (
      <ThemedView style={[styles.center, { paddingHorizontal: Layout.screenPaddingX }]}>
        <ThemedText style={styles.error}>{error}</ThemedText>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.tint }]}
          onPress={() => router.replace(`/(app)/stays?tab=redeem&code=${encodeURIComponent(c)}` as never)}
        >
          <Text style={styles.ctaText}>Enter code manually</Text>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  const estateName = preview?.estateName ?? 'a property';
  const location = preview?.location;
  const inviter = preview?.inviterName;

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}>
      <View style={styles.hero}>
        <View style={[styles.iconWrap, { backgroundColor: colors.tintMuted }]}>
          <IconSymbol name="envelope.fill" size={28} color={colors.tint} />
        </View>
        <ThemedText type="title" style={styles.title}>
          You're invited
        </ThemedText>
        <ThemedText style={[styles.body, { color: colors.icon }]}>
          {inviter
            ? `${inviter} invited you to ${estateName} on Maison.`
            : `Join ${estateName} on Maison.`}
        </ThemedText>
        {location ? (
          <View style={styles.locRow}>
            <IconSymbol name="map.fill" size={13} color={colors.icon} />
            <ThemedText style={[styles.loc, { color: colors.icon }]}>{location}</ThemedText>
          </View>
        ) : null}
        {!preview && previewTried ? (
          <ThemedText style={[styles.codeHint, { color: colors.icon }]}>
            Invite code: {c}
          </ThemedText>
        ) : null}
        <ThemedText style={[styles.means, { color: colors.icon }]}>
          Accepting gives you access to this property — no subscription needed.
        </ThemedText>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.tint }]}
          onPress={onSignUpToAccept}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Sign up to accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setPendingInviteCode(c);
            setSkipOnboardingForInvite(true);
            router.replace('/(auth)' as never);
          }}
          style={styles.secondary}
        >
          <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>I already have an account</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Layout.screenPaddingX, justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  hero: { gap: 12, paddingTop: Spacing.xl },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 28, fontFamily: Fonts.heading },
  body: { fontSize: 16, lineHeight: 24 },
  means: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  loc: { fontSize: 13 },
  codeHint: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', marginTop: 4 },
  muted: { fontSize: 14, marginTop: 8 },
  error: { fontSize: 15, textAlign: 'center', marginBottom: 8 },
  footer: { gap: 14 },
  cta: {
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondary: { alignItems: 'center', paddingVertical: 8 },
  linkBtn: { marginTop: 8 },
});
