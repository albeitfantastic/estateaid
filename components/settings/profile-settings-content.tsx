import { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { FocusInput } from '@/components/ui/focus-input';
import {
  FilledButton,
  ScreenScroll,
  ScreenShell,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import { useProfileStore } from '@/store/profile-store';

export function ProfileSettingsContent() {
  const { t } = useTranslation();
  const { colors } = useScreenTheme();
  const currentUser = useAuthStore((s) => s.currentUser);
  const patchUser = useAuthStore((s) => s.patchUser);
  const [name, setName] = useState(currentUser?.name ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(currentUser?.name ?? '');
  }, [currentUser?.id, currentUser?.name]);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert(t('profileSettings.nameRequiredTitle'), t('profileSettings.nameRequiredBody'));
      return;
    }
    if (!currentUser) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ name: trimmed }).eq('id', currentUser.id);
      if (error) {
        Alert.alert(t('profileSettings.saveFailedTitle'), error.message);
        return;
      }
      patchUser({ name: trimmed });
      await useProfileStore.getState().fetchFromSupabase();
      Alert.alert(t('profileSettings.savedTitle'), t('profileSettings.savedBody'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenShell title={t('settingsScreens.profileTitle')}>
      <ScreenScroll contentContainerStyle={styles.form} gap={16} keyboardShouldPersistTaps="handled">
        <FocusInput
          label={t('profileSettings.email')}
          value={currentUser?.email ?? '—'}
          editable={false}
        />

        <FocusInput
          label={t('profileSettings.displayName')}
          value={name}
          onChangeText={setName}
          placeholder={t('profileSettings.placeholderName')}
          autoCapitalize="words"
          editable={!saving}
        />
        <ThemedText style={[styles.hint, { color: colors.icon }]}>
          {t('profileSettings.hint')}
        </ThemedText>

        <FilledButton
          label={t('common.save')}
          onPress={() => void save()}
          disabled={saving}
          loading={saving}
          style={{ marginTop: 20 }}
        />
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  form: { paddingTop: 8 },
  hint: { fontSize: 13, lineHeight: 18, marginTop: -8 },
});
