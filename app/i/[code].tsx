import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  GroupedList,
  GroupedRow,
  OutlineButton,
  ScreenFootnote,
  ScreenScroll,
  ScreenShell,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { estateHrefAfterInviteAccept } from '@/lib/guest-landing';
import { useAuthStore } from '@/store/auth-store';
import { useInvitationStore } from '@/store/invitation-store';

type InvitePreview = {
  estateName: string;
  location: string | null;
  inviterName: string | null;
};

/** Deep link: https://maison.app/i/CODE or maison://i/CODE */
export default function InviteDeepLink() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const c = typeof code === 'string' ? code.trim().toUpperCase() : '';
  const router = useRouter();
  const { colors, cardShadow } = useScreenTheme();

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
        router.replace(estateHrefAfterInviteAccept(r.invitation) as never);
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
      <ScreenShell showBack={false} title="Invalid invite">
        <ScreenScroll contentContainerStyle={styles.center}>
          <ScreenFootnote>Invalid invite link.</ScreenFootnote>
          <OutlineButton label="Go home" onPress={() => router.replace('/' as never)} />
        </ScreenScroll>
      </ScreenShell>
    );
  }

  if (!isHydrated || (currentUser && busy && !error)) {
    return (
      <ScreenShell showBack={false} title="Opening invite">
        <View style={styles.center}>
          <ActivityIndicator color={colors.tint} />
          <ThemedText style={{ color: colors.textSecondary }}>Opening invite…</ThemedText>
        </View>
      </ScreenShell>
    );
  }

  if (currentUser && error) {
    return (
      <ScreenShell showBack={false} title="Invite error">
        <ScreenScroll contentContainerStyle={styles.center} gap={16}>
          <ThemedText style={styles.error}>{error}</ThemedText>
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: colors.tint }, cardShadow]}
            onPress={() =>
              router.replace(`/(app)/estates/join?code=${encodeURIComponent(c)}` as never)
            }
          >
            <ThemedText style={styles.ctaText}>Enter code manually</ThemedText>
          </TouchableOpacity>
        </ScreenScroll>
      </ScreenShell>
    );
  }

  const estateName = preview?.estateName ?? 'a property';
  const location = preview?.location;
  const inviter = preview?.inviterName;

  return (
    <ScreenShell showBack={false} title="You're invited">
      <ScreenScroll contentContainerStyle={styles.scroll} gap={16}>
        <View style={[styles.iconWrap, { backgroundColor: colors.tintMuted }]}>
          <IconSymbol name="envelope.fill" size={28} color={colors.tint} />
        </View>

        <ScreenFootnote>
          {inviter
            ? `${inviter} invited you to ${estateName} on Maison.`
            : `Join ${estateName} on Maison.`}
        </ScreenFootnote>

        <GroupedList>
          {[
            location
              ? { key: 'loc', icon: 'map.fill' as const, title: location, subtitle: 'Location' }
              : null,
            !preview && previewTried
              ? { key: 'code', icon: 'number' as const, title: c, subtitle: 'Invite code' }
              : null,
            {
              key: 'access',
              icon: 'checkmark.seal.fill' as const,
              title: 'No subscription needed',
              subtitle: 'Accepting gives you access to this property.',
            },
          ]
            .filter(Boolean)
            .map((row, i, arr) => (
              <GroupedRow
                key={row!.key}
                icon={row!.icon}
                title={row!.title}
                subtitle={row!.subtitle}
                isLast={i === arr.length - 1}
              />
            ))}
        </GroupedList>

        <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.tint }, cardShadow]}
          onPress={onSignUpToAccept}
          activeOpacity={0.85}
        >
          <ThemedText style={styles.ctaText}>Sign up to accept</ThemedText>
        </TouchableOpacity>

        <OutlineButton
          label="I already have an account"
          onPress={() => {
            setPendingInviteCode(c);
            setSkipOnboardingForInvite(true);
            router.replace('/(auth)' as never);
          }}
        />
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 24,
  },
  scroll: {
    flexGrow: 1,
    paddingTop: 8,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  error: { fontSize: 15, textAlign: 'center' },
  cta: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaText: { color: Colors.light.textOnBrand, fontWeight: '700', fontSize: 16 },
});
