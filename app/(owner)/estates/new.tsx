import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { generateId } from '@/lib/id';
import { isRequired } from '@/lib/validators';

export default function NewEstate() {
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

  function submit() {
    if (!isRequired(name)) { Alert.alert('Required', 'Please enter an estate name.'); return; }
    if (!isRequired(location)) { Alert.alert('Required', 'Please enter a location.'); return; }

    addEstate({
      id: generateId(),
      ownerId: currentUser!.id,
      name: name.trim(),
      location: location.trim(),
      description: description.trim() || undefined,
      coverImageUrl: coverImageUrl || undefined,
      timeZone: timeZone.trim(),
      createdAt: new Date().toISOString(),
    });
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>New Estate</ThemedText>
        <TouchableOpacity onPress={submit} style={styles.saveBtn}>
          <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 16 }}>Save</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cover photo picker */}
        <TouchableOpacity
          style={[styles.photoWrap, { borderColor: colors.border ?? colors.icon + '44', backgroundColor: colors.tint + '10' }]}
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

        <Field label="Name *" colors={colors}>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.icon + '44' }]}
            placeholder="e.g. Villa Serena"
            placeholderTextColor={colors.icon}
            value={name}
            onChangeText={setName}
          />
        </Field>
        <Field label="Location *" colors={colors}>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.icon + '44' }]}
            placeholder="e.g. Tuscany, Italy"
            placeholderTextColor={colors.icon}
            value={location}
            onChangeText={setLocation}
          />
        </Field>
        <Field label="Time Zone" colors={colors}>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.icon + '44' }]}
            placeholder="e.g. Europe/Rome"
            placeholderTextColor={colors.icon}
            value={timeZone}
            onChangeText={setTimeZone}
          />
        </Field>
        <Field label="Description" colors={colors}>
          <TextInput
            style={[styles.input, styles.multiline, { color: colors.text, borderColor: colors.icon + '44' }]}
            placeholder="Optional description for your guests…"
            placeholderTextColor={colors.icon}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Field>
      </ScrollView>
    </ThemedView>
  );
}

function Field({ label, children, colors }: { label: string; children: React.ReactNode; colors: typeof Colors.light }) {
  return (
    <View style={styles.field}>
      <ThemedText style={[styles.label, { color: colors.icon }]}>{label}</ThemedText>
      {children}
    </View>
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
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    overflow: 'hidden',
    height: 180,
  },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  multiline: {
    height: 100,
    paddingTop: 12,
  },
});
