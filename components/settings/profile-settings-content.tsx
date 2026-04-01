import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import { useProfileStore } from '@/store/profile-store';

export function ProfileSettingsContent() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
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
    <ThemedView style={styles.container}>
      <View style={[styles.inner, { paddingBottom: insets.bottom + 24 }]}>
        <ThemedText style={[styles.label, { color: colors.icon }]}>Email</ThemedText>
        <ThemedText style={styles.readonly}>{currentUser?.email ?? '—'}</ThemedText>

        <ThemedText style={[styles.label, { color: colors.icon, marginTop: 20 }]}>Display name</ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          value={name}
          onChangeText={setName}
          placeholder={t('profileSettings.placeholderName')}
          placeholderTextColor={colors.icon}
          autoCapitalize="words"
          editable={!saving}
        />
        <ThemedText style={[styles.hint, { color: colors.icon }]}>
          This name is shown to hosts, guests, and in messages.
        </ThemedText>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.tint }]}
          onPress={() => void save()}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.saveBtnText}>{t('common.save')}</ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { paddingHorizontal: 20, paddingTop: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  readonly: { fontSize: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  hint: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  saveBtn: {
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
