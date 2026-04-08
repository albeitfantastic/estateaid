import { Fragment, useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Layout } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();
  const [preference, setPreference] = useState<AppLanguage | null | undefined>(undefined);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('language.screenTitle') });
  }, [navigation, t, i18n.language]);

  useEffect(() => {
    void getAppLanguagePreference().then(setPreference);
  }, [i18n.language]);

  function row(
    selected: boolean,
    onPress: () => void,
    main: string,
    sub?: string
  ) {
    return (
      <TouchableOpacity
        style={[
          styles.option,
          {
            borderColor: selected ? colors.tint : colors.border,
            backgroundColor: selected ? colors.tint + '10' : colors.surface,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold" style={styles.optionMain}>
            {main}
          </ThemedText>
          {sub ? (
            <ThemedText style={[styles.optionSub, { color: colors.icon }]}>{sub}</ThemedText>
          ) : null}
        </View>
        {selected ? <IconSymbol name="checkmark.circle.fill" size={22} color={colors.tint} /> : null}
      </TouchableOpacity>
    );
  }

  if (preference === undefined) {
    return (
      <ThemedView style={[styles.centered, styles.container]}>
        <ActivityIndicator color={colors.tint} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.inner, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText style={[styles.description, { color: colors.icon }]}>{t('language.description')}</ThemedText>

        <ThemedText type="defaultSemiBold" style={[styles.section, { color: colors.text }]}>
          {t('language.sectionApp')}
        </ThemedText>

        {row(preference === null, () => {
          void (async () => {
            await clearAppLanguagePreference();
            setPreference(null);
          })();
        }, t('language.followDevice'), t('language.followDeviceSub'))}

        <View style={{ height: 8 }} />

        {LANG_OPTIONS.map(({ code, label }) => (
          <Fragment key={code}>
            {row(preference === code, () => {
              void (async () => {
                await setAppLanguage(code);
                setPreference(code);
              })();
            }, label)}
          </Fragment>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  inner: { paddingHorizontal: Layout.screenPaddingX, paddingTop: 16 },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  section: { fontSize: 13, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  optionMain: { fontSize: 16 },
  optionSub: { fontSize: 12, marginTop: 4 },
});
