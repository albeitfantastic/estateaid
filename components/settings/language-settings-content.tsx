import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { inputBaseStyle } from '@/components/ui/focus-input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  GroupedList,
  GroupedRow,
  ScreenScroll,
  ScreenShell,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import {
  type AppLanguage,
  clearAppLanguagePreference,
  getAppLanguagePreference,
  setAppLanguage,
} from '@/lib/i18n';

const LANG_OPTIONS: { code: AppLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pl', label: 'Polski' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'ru', label: 'Русский' },
  { code: 'pt', label: 'Português' },
];

export function LanguageSettingsContent() {
  const { colors } = useScreenTheme();
  const { t, i18n } = useTranslation();
  const [preference, setPreference] = useState<AppLanguage | null | undefined>(undefined);

  useEffect(() => {
    void getAppLanguagePreference().then(setPreference);
  }, [i18n.language]);

  if (preference === undefined) {
    return (
      <ScreenShell title={t('language.screenTitle')}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.tint} />
        </View>
      </ScreenShell>
    );
  }

  const rows: { key: string; selected: boolean; onPress: () => void; title: string; subtitle?: string }[] = [
    {
      key: 'device',
      selected: preference === null,
      onPress: () => {
        void (async () => {
          await clearAppLanguagePreference();
          setPreference(null);
        })();
      },
      title: t('language.followDevice'),
      subtitle: t('language.followDeviceSub'),
    },
    ...LANG_OPTIONS.map(({ code, label }) => ({
      key: code,
      selected: preference === code,
      onPress: () => {
        void (async () => {
          await setAppLanguage(code);
          setPreference(code);
        })();
      },
      title: label,
    })),
  ];

  return (
    <ScreenShell title={t('language.screenTitle')}>
      <ScreenScroll contentContainerStyle={styles.form} gap={16}>
        <ThemedText style={[styles.hint, { color: colors.icon }]}>{t('language.description')}</ThemedText>

        <View style={styles.field}>
          <ThemedText style={[inputBaseStyle.label, { color: colors.icon }]}>
            {t('language.sectionApp')}
          </ThemedText>
          <GroupedList>
            {rows.map((row, i) => (
              <GroupedRow
                key={row.key}
                title={row.title}
                subtitle={row.subtitle}
                trailing={
                  row.selected ? <IconSymbol name="checkmark.circle.fill" size={22} color={colors.tint} /> : null
                }
                onPress={row.onPress}
                isLast={i === rows.length - 1}
              />
            ))}
          </GroupedList>
        </View>
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  form: { paddingTop: 8 },
  field: { gap: 6 },
  hint: { fontSize: 13, lineHeight: 18 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
