import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  ScreenScroll,
  ScreenShell,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { Layout, Radius } from '@/constants/theme';
import { SUPPORT_EMAIL, supportMailto } from '@/lib/support';

export interface LegalSection {
  heading?: string;
  body: string;
}

interface LegalDocumentProps {
  title: string;
  /** Optional lead paragraph rendered above the sections. */
  intro?: string;
  sections: LegalSection[];
}

/**
 * Shared shell for the Terms / Privacy / Impressum screens. Every one of them is a
 * pre-launch draft, so the draft notice is part of the component rather than the copy.
 */
export function LegalDocument({ title, intro, sections }: LegalDocumentProps) {
  const { t } = useTranslation();
  const { colors } = useScreenTheme();

  return (
    <ScreenShell title={title}>
      <ScreenScroll contentContainerStyle={styles.scroll} gap={Layout.sectionGap}>
        <View
          style={[
            styles.notice,
            { backgroundColor: colors.warning + '14', borderColor: colors.warning + '40' },
          ]}
        >
          <View style={styles.noticeHeader}>
            <IconSymbol name="exclamationmark.triangle.fill" size={14} color={colors.warning} />
            <ThemedText style={[styles.noticeHeading, { color: colors.warning }]}>
              {t('legal.draftHeading')}
            </ThemedText>
          </View>
          <ThemedText style={[styles.body, { color: colors.text }]}>
            {t('legal.draftBody')}
          </ThemedText>
          <ThemedText style={[styles.meta, { color: colors.textSecondary }]}>
            {t('legal.lastUpdated')}
          </ThemedText>
        </View>

        {!!intro && (
          <ThemedText style={[styles.body, { color: colors.textSecondary }]}>{intro}</ThemedText>
        )}

        {sections.map((section) => (
          <View key={section.heading ?? section.body.slice(0, 24)} style={styles.section}>
            {!!section.heading && (
              <ThemedText type="defaultSemiBold" style={styles.heading}>
                {section.heading}
              </ThemedText>
            )}
            <ThemedText style={[styles.body, { color: colors.textSecondary }]}>
              {section.body}
            </ThemedText>
          </View>
        ))}

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.heading}>
            {t('legal.contactHeading')}
          </ThemedText>
          <TouchableOpacity
            onPress={() => void Linking.openURL(supportMailto(title))}
            activeOpacity={0.7}
            accessibilityRole="link"
            accessibilityLabel={t('common.emailSupport')}
          >
            <ThemedText style={[styles.body, { color: colors.tint }]}>
              {t('legal.contactBody', { email: SUPPORT_EMAIL })}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 4 },
  notice: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  noticeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noticeHeading: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { gap: 6 },
  heading: { fontSize: 16 },
  body: { fontSize: 14, lineHeight: 21 },
  meta: { fontSize: 12 },
});
