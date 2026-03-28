import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEstateStore } from '@/store/estate-store';
import { isRequired } from '@/lib/validators';

export default function EditEstate() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { getEstateById, updateEstate } = useEstateStore();
  const estate = getEstateById(estateId);

  const [name, setName] = useState(estate?.name ?? '');
  const [location, setLocation] = useState(estate?.location ?? '');
  const [description, setDescription] = useState(estate?.description ?? '');
  const [timeZone, setTimeZone] = useState(estate?.timeZone ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState(estate?.coverImageUrl ?? '');

  if (!estate) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>Estate not found.</ThemedText>
      </ThemedView>
    );
  }

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
    updateEstate(estateId, {
      name: name.trim(),
      location: location.trim(),
      description: description.trim() || undefined,
      timeZone: timeZone.trim(),
      coverImageUrl: coverImageUrl || undefined,
    });
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>Edit Estate</ThemedText>
        <TouchableOpacity onPress={submit}>
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

        {([
          ['Name *', name, setName, 'e.g. Villa Serena'],
          ['Location *', location, setLocation, 'e.g. Tuscany, Italy'],
          ['Time Zone', timeZone, setTimeZone, 'e.g. Europe/Rome'],
        ] as [string, string, (v: string) => void, string][]).map(([label, value, setter, placeholder]) => (
          <View key={label} style={styles.field}>
            <ThemedText style={[styles.label, { color: colors.icon }]}>{label}</ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.icon + '44' }]}
              placeholder={placeholder}
              placeholderTextColor={colors.icon}
              value={value}
              onChangeText={setter}
            />
          </View>
        ))}
        <View style={styles.field}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Description</ThemedText>
          <TextInput
            style={[styles.input, styles.multiline, { color: colors.text, borderColor: colors.icon + '44' }]}
            placeholder="Optional description…"
            placeholderTextColor={colors.icon}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 24, fontWeight: '700' },
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
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  multiline: { height: 100, paddingTop: 12 },
});
