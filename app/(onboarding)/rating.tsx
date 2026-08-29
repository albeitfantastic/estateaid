import { useMemo, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { APP_STORE_URL } from '@/lib/invite-messages';
import { resolveReturnTo } from '@/lib/paywall-nav';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase';

const C = {
  bg: '#F4F4F2',
  navy: '#234536',
  gold: '#E9A840',
  text: '#1A2B28',
  muted: '#607D8B',
  border: '#DDE1E0',
};

export default function RatingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const currentUserId = useAuthStore((s) => s.currentUser?.id);
  const [selected, setSelected] = useState<number | null>(null);
  const back = resolveReturnTo(returnTo);

  const ratingLabels = useMemo(
    () => ['', t('rating.poor'), t('rating.fair'), t('rating.good'), t('rating.great'), t('rating.excellent')],
    [t]
  );

  async function proceed() {
    if (currentUserId) {
      await supabase
        .from('profiles')
        .update({ rating_prompt_shown_at: new Date().toISOString() })
        .eq('id', currentUserId);
    }
    router.replace(back as never);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>{t('rating.eyebrow')}</Text>
        <Text style={styles.title}>{t('rating.title')}</Text>
        <Text style={styles.subtitle}>{t('rating.subtitle')}</Text>

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setSelected(star)}
              activeOpacity={0.7}
              style={styles.starBtn}
            >
              <Text style={[styles.star, star <= (selected ?? 0) && styles.starFilled]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>

        {selected !== null && (
          <Text style={styles.ratingLabel}>{ratingLabels[selected] ?? ''}</Text>
        )}

        {selected !== null && selected >= 4 && (
          <TouchableOpacity
            style={styles.appStoreBtn}
            onPress={() => {
              Linking.openURL(APP_STORE_URL);
              void proceed();
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.appStoreBtnText}>{t('rating.rateAppStore')}</Text>
          </TouchableOpacity>
        )}

        {selected !== null && selected < 4 && (
          <View style={styles.feedbackNote}>
            <Text style={styles.feedbackNoteText}>{t('rating.feedbackNote')}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, selected === null && styles.btnDisabled]}
          onPress={() => void proceed()}
          disabled={selected === null}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>
            {selected !== null && selected >= 4 ? t('rating.continue') : t('rating.continueAnyway')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => void proceed()} style={styles.skipLink}>
          <Text style={styles.skipText}>{t('rating.skip')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 13,
    color: C.muted,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: C.text,
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: C.muted,
    lineHeight: 22,
    marginBottom: 32,
    textAlign: 'center',
  },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  starBtn: { padding: 4 },
  star: { fontSize: 40, color: C.border },
  starFilled: { color: C.gold },
  ratingLabel: { fontSize: 16, fontWeight: '600', color: C.navy, marginBottom: 16 },
  appStoreBtn: {
    backgroundColor: C.navy,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  appStoreBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  feedbackNote: { paddingHorizontal: 16, marginTop: 8 },
  feedbackNoteText: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20 },
  footer: { paddingHorizontal: 24, paddingBottom: 16, gap: 8 },
  btn: {
    backgroundColor: C.navy,
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: C.border },
  btnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  skipLink: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 14, color: C.muted },
});
