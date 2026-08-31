import { useMemo, useState } from 'react';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import {
  OutlineButton,
  ScreenScroll,
  ScreenShell,
  SectionLabel,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { APP_STORE_URL } from '@/lib/invite-messages';
import { Colors } from '@/constants/theme';
import { resolveReturnTo } from '@/lib/paywall-nav';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase';

export default function RatingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const currentUserId = useAuthStore((s) => s.currentUser?.id);
  const [selected, setSelected] = useState<number | null>(null);
  const back = resolveReturnTo(returnTo);
  const { colors, cardShadow } = useScreenTheme();

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
    <ScreenShell showBack={false} title={t('rating.title')}>
      <ScreenScroll contentContainerStyle={styles.scroll} gap={16}>
        <SectionLabel>{t('rating.eyebrow')}</SectionLabel>
        <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('rating.subtitle')}
        </ThemedText>

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setSelected(star)}
              activeOpacity={0.7}
              style={styles.starBtn}
            >
              <ThemedText
                style={[
                  styles.star,
                  { color: colors.border },
                  star <= (selected ?? 0) && { color: colors.accent },
                ]}
              >
                ★
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {selected !== null ? (
          <ThemedText type="defaultSemiBold" style={[styles.ratingLabel, { color: colors.tint }]}>
            {ratingLabels[selected] ?? ''}
          </ThemedText>
        ) : null}

        {selected !== null && selected >= 4 ? (
          <TouchableOpacity
            style={[styles.appStoreBtn, { backgroundColor: colors.tint }, cardShadow]}
            onPress={() => {
              Linking.openURL(APP_STORE_URL);
              void proceed();
            }}
            activeOpacity={0.85}
          >
            <ThemedText style={styles.appStoreBtnText}>{t('rating.rateAppStore')}</ThemedText>
          </TouchableOpacity>
        ) : null}

        {selected !== null && selected < 4 ? (
          <ThemedText style={[styles.feedbackNote, { color: colors.textSecondary }]}>
            {t('rating.feedbackNote')}
          </ThemedText>
        ) : null}

        <TouchableOpacity
          style={[
            styles.btn,
            { backgroundColor: selected === null ? colors.border : colors.tint },
            selected !== null && cardShadow,
          ]}
          onPress={() => void proceed()}
          disabled={selected === null}
          activeOpacity={0.85}
        >
          <ThemedText style={styles.btnText}>
            {selected !== null && selected >= 4 ? t('rating.continue') : t('rating.continueAnyway')}
          </ThemedText>
        </TouchableOpacity>

        <OutlineButton label={t('rating.skip')} onPress={() => void proceed()} />
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingTop: 8,
    alignItems: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  starBtn: { padding: 4 },
  star: { fontSize: 40 },
  ratingLabel: { fontSize: 16, marginBottom: 8 },
  appStoreBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  appStoreBtnText: { color: Colors.light.textOnBrand, fontSize: 15, fontWeight: '700' },
  feedbackNote: { textAlign: 'center', paddingHorizontal: 16, fontSize: 14, lineHeight: 20 },
  btn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
});
