import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  ScreenFootnote,
  ScreenScroll,
  ScreenShell,
  useScreenTheme,
} from '@/components/ui/screen-layout';

/** Framing before property creation (§5.3). */
export default function FramePropertyScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, cardShadow } = useScreenTheme();

  return (
    <ScreenShell
      title={t('onboarding.frameTitle', { defaultValue: 'Your property, in one calm place' })}
      showBack
    >
      <ScreenScroll contentContainerStyle={styles.scroll} gap={20}>
        <ScreenFootnote>
          {t('onboarding.frameBody', {
            defaultValue:
              'Add a name and optional location. You can fill in the rest whenever you are ready.',
          })}
        </ScreenFootnote>

        <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.tint }, cardShadow]}
          onPress={() => router.push('/(app)/estates/new?fromOnboarding=1' as never)}
          activeOpacity={0.85}
        >
          <ThemedText style={styles.ctaText}>
            {t('onboarding.frameCta', { defaultValue: 'Add your property' })}
          </ThemedText>
        </TouchableOpacity>
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 8,
  },
  cta: {
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
