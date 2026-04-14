import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { FocusInput } from '@/components/ui/focus-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { generateUuidV4 } from '@/lib/id';
import { isRequired } from '@/lib/validators';

export default function NewEstate() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const addEstate = useEstateStore((s) => s.addEstate);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [timeZone, setTimeZone] = useState('Europe/London');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [saving, setSaving] = useState(false);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      setCoverImageUrl(result.assets[0].uri);
    }
  }

  async function submit() {
    if (!isRequired(name)) { Alert.alert('Required', 'Please enter an estate name.'); return; }
    if (!isRequired(location)) { Alert.alert('Required', 'Please enter a location.'); return; }
    if (!currentUser) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await addEstate({
        id: generateUuidV4(),
        ownerId: currentUser.id,
        name: name.trim(),
        location: location.trim(),
        description: description.trim() || undefined,
        coverImageUrl: coverImageUrl || undefined,
        timeZone: timeZone.trim(),
        createdAt: new Date().toISOString(),
      });

      if (error) {
        Alert.alert('Could not save property', error);
        return;
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>{t('titles.newEstate')}</ThemedText>
        <TouchableOpacity onPress={() => void submit()} style={styles.saveBtn} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={colors.tint} size="small" />
          ) : (
            <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 16 }}>Save</ThemedText>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cover photo picker */}
        <TouchableOpacity
          style={[styles.photoWrap, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
          onPress={pickPhoto}
          activeOpacity={0.8}
        >
          {coverImageUrl ? (
            <Image source={{ uri: coverImageUrl }} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <IconSymbol name="camera.fill" size={28} color={colors.tint} />
              <ThemedText style={{ color: colors.tint, fontWeight: '600', marginTop: 8 }}>
                Add Cover Photo
              </ThemedText>
              <ThemedText style={{ color: colors.icon, fontSize: 12, marginTop: 2 }}>
                16 : 9 recommended
              </ThemedText>
            </View>
          )}
        </TouchableOpacity>

        <FocusInput label="Name *" placeholder="e.g. Villa Serena" value={name} onChangeText={setName} />
        <FocusInput label="Location *" placeholder="e.g. Tuscany, Italy" value={location} onChangeText={setLocation} />
        <FocusInput label="Time Zone" placeholder="e.g. Europe/Rome" value={timeZone} onChangeText={setTimeZone} />
        <FocusInput
          label="Description"
          placeholder="Optional description for your guests…"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={styles.multiline}
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 24, fontWeight: '700' },
  saveBtn: { padding: 4 },
  form: { paddingHorizontal: 20, gap: 20, paddingTop: 8 },
  photoWrap: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    overflow: 'hidden',
    height: 180,
  },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  multiline: {
    height: 110,
    paddingTop: 14,
  },
});
