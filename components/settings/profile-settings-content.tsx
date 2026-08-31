import { useEffect, useState } from 'react';
import { Alert, StyleSheet, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import {
  FilledButton,
  GroupedList,
  GroupedRow,
  ScreenScroll,
  ScreenShell,
  SectionLabel,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { Layout } from '@/constants/theme';
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
      Alert.alert('Name required', 'Please enter a display name.');
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
    <ScreenShell title="Profile">
      <ScreenScroll contentContainerStyle={styles.scroll}>
        <SectionLabel>Email</SectionLabel>
        <GroupedList>
          <GroupedRow title={currentUser?.email ?? '—'} isLast />
        </GroupedList>

        <SectionLabel marginTop={Layout.sectionGap}>Display name</SectionLabel>
        <GroupedList>
          <GroupedRow
            title={
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder={t('profileSettings.placeholderName')}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                editable={!saving}
              />
            }
            isLast
          />
        </GroupedList>
        <ThemedText style={[styles.hint, { color: colors.textSecondary }]}>
          This name is shown to hosts, guests, and in messages.
        </ThemedText>

        <FilledButton
          label={t('common.save')}
          onPress={() => void save()}
          disabled={saving}
          loading={saving}
          style={{ marginTop: 24 }}
        />
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: Layout.sectionGap - 8 },
  input: { fontSize: 16, padding: 0, minHeight: 22 },
  hint: { fontSize: 13, marginTop: 8, lineHeight: 18 },
});
