import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenScroll, ScreenShell, SectionLabel, useScreenTheme } from '@/components/ui/screen-layout';
import { useCan } from '@/lib/entitlements/capabilities';
import { openHostCapabilityDenied } from '@/lib/entitlements/host-gate';
import { uploadEstateDocumentFile } from '@/lib/estate-document-storage';
import { generateUuidV4 } from '@/lib/id';
import { isRequired } from '@/lib/validators';
import { useAuthStore } from '@/store/auth-store';
import { useDocumentStore } from '@/store/document-store';
import { DocumentCategory } from '@/types';

type PickedFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
};

const CATEGORIES: DocumentCategory[] = ['guide', 'manual', 'rule', 'emergency', 'other'];
const CATEGORY_LABELS: Record<DocumentCategory, string> = { guide: 'Guide', manual: 'Manual', rule: 'House Rules', emergency: 'Emergency', other: 'Other' };

export default function UploadDocument() {
  const { t } = useTranslation();
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const can = useCan();
  const { colors } = useScreenTheme();
  const currentUser = useAuthStore((s) => s.currentUser);
  const addDocument = useDocumentStore((s) => s.addDocument);
  const docsPath = `/(app)/estates/${estateId}/documents`;
  const allowed = can('documents.upload', { estateId });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('guide');
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (allowed) return;
    openHostCapabilityDenied(estateId, 'documents.upload', docsPath);
    router.replace(docsPath as never);
  }, [allowed, docsPath, router]);

  if (!allowed) {
    return <ThemedView style={{ flex: 1 }} />;
  }

  async function pickFile() {
    try {
      // Lazy-load so missing native module does not crash route discovery / screen mount.
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true });
      if (result.canceled || result.assets.length === 0) return;
      setPickedFile(result.assets[0]);
      if (!title.trim()) setTitle(result.assets[0].name.replace(/\.[^./]+$/, ''));
    } catch (e) {
      Alert.alert(
        'Development build required',
        'Document picker was added after your last native build. Rebuild the Maison development client (npm run eas:dev:ios or eas:dev:android), install it, then try again.'
      );
    }
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
    <ScreenShell
      title={t('titles.uploadDocument')}
      headerRight={
        <TouchableOpacity onPress={() => void submit()} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator color={colors.tint} />
          ) : (
            <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 16 }}>Save</ThemedText>
          )}
        </TouchableOpacity>
      }
    >
      <ScreenScroll contentContainerStyle={styles.form} gap={20} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <SectionLabel>File *</SectionLabel>
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
          <SectionLabel>Title *</SectionLabel>
          <TextInput style={[styles.input, { color: colors.text, borderColor: colors.icon + '44' }]} placeholder="Document title" placeholderTextColor={colors.icon} value={title} onChangeText={setTitle} />
        </View>
        <View style={styles.field}>
          <SectionLabel>Description</SectionLabel>
          <TextInput style={[styles.input, styles.multi, { color: colors.text, borderColor: colors.icon + '44' }]} placeholder="Brief description" placeholderTextColor={colors.icon} value={description} onChangeText={setDescription} multiline numberOfLines={3} textAlignVertical="top" />
        </View>
        <View style={styles.field}>
          <SectionLabel>Category</SectionLabel>
          <View style={styles.pills}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.pill, { borderColor: colors.tint + '55' }, category === cat && { backgroundColor: colors.tint }]}
                onPress={() => setCategory(cat)}
              >
                <ThemedText style={[styles.pillText, { color: category === cat ? colors.textOnBrand : colors.text }]}>
                  {CATEGORY_LABELS[cat]}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  form: { paddingTop: 8, gap: 20 },
  field: { gap: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  filePicker: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  multi: { height: 80, paddingTop: 12 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 13, fontWeight: '500' },
});
