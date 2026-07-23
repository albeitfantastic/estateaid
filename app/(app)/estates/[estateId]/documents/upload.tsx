import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as DocumentPicker from 'expo-document-picker';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useDocumentStore } from '@/store/document-store';
import { uploadEstateDocumentFile } from '@/lib/estate-document-storage';
import { debugLog } from '@/lib/debug-session-log';
import { generateUuidV4 } from '@/lib/id';
import { isRequired } from '@/lib/validators';
import { DocumentCategory } from '@/types';

const CATEGORIES: DocumentCategory[] = ['guide', 'manual', 'rule', 'emergency', 'other'];
const CATEGORY_LABELS: Record<DocumentCategory, string> = { guide: 'Guide', manual: 'Manual', rule: 'House Rules', emergency: 'Emergency', other: 'Other' };

export default function UploadDocument() {
  const { t } = useTranslation();
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const addDocument = useDocumentStore((s) => s.addDocument);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('guide');
  const [pickedFile, setPickedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true });
    if (result.canceled || result.assets.length === 0) return;
    setPickedFile(result.assets[0]);
    if (!title.trim()) setTitle(result.assets[0].name.replace(/\.[^./]+$/, ''));
  }

  async function submit() {
    if (!isRequired(title)) { Alert.alert('Required', 'Please enter a document title.'); return; }
    if (!pickedFile) { Alert.alert('Required', 'Please choose a file to upload.'); return; }

    setUploading(true);
    const documentId = generateUuidV4();
    const uploadResult = await uploadEstateDocumentFile(estateId, documentId, pickedFile);
    setUploading(false);
    if (uploadResult.error) {
      Alert.alert('Upload Failed', uploadResult.error);
      return;
    }

    // #region agent log
    debugLog('H2', 'documents/upload.tsx:submit', 'calling addDocument without await then router.back', {
      documentId,
      estateId,
      storagePath: uploadResult.path,
      awaited: false,
    });
    // #endregion
    addDocument({
      id: documentId,
      estateId,
      title: title.trim(),
      description: description.trim() || undefined,
      fileUri: uploadResult.path,
      mimeType: pickedFile.mimeType ?? 'application/octet-stream',
      fileSizeBytes: pickedFile.size ?? 0,
      category,
      uploadedBy: currentUser!.id,
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
        <ThemedText type="title" style={styles.title}>{t('titles.uploadDocument')}</ThemedText>
        <TouchableOpacity onPress={() => void submit()} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator color={colors.tint} />
          ) : (
            <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 16 }}>Save</ThemedText>
          )}
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>File *</ThemedText>
          <TouchableOpacity
            style={[styles.filePicker, { borderColor: colors.icon + '44' }]}
            onPress={() => void pickFile()}
          >
            <IconSymbol name="doc.fill" size={20} color={colors.tint} />
            <ThemedText numberOfLines={1} style={{ flex: 1, color: pickedFile ? colors.text : colors.icon }}>
              {pickedFile ? pickedFile.name : 'Choose a file'}
            </ThemedText>
          </TouchableOpacity>
        </View>
        <View style={styles.field}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Title *</ThemedText>
          <TextInput style={[styles.input, { color: colors.text, borderColor: colors.icon + '44' }]} placeholder="Document title" placeholderTextColor={colors.icon} value={title} onChangeText={setTitle} />
        </View>
        <View style={styles.field}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Description</ThemedText>
          <TextInput style={[styles.input, styles.multi, { color: colors.text, borderColor: colors.icon + '44' }]} placeholder="Brief description" placeholderTextColor={colors.icon} value={description} onChangeText={setDescription} multiline numberOfLines={3} textAlignVertical="top" />
        </View>
        <View style={styles.field}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Category</ThemedText>
          <View style={styles.pills}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.pill, { borderColor: colors.tint + '55' }, category === cat && { backgroundColor: colors.tint }]}
                onPress={() => setCategory(cat)}
              >
                <ThemedText style={[styles.pillText, { color: category === cat ? '#fff' : colors.text }]}>
                  {CATEGORY_LABELS[cat]}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 24, fontWeight: '700' },
  form: { paddingHorizontal: 20, gap: 20, paddingTop: 8 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  filePicker: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  multi: { height: 80, paddingTop: 12 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 13, fontWeight: '500' },
});
