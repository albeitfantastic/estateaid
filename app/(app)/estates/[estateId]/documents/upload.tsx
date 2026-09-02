import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FocusInput, inputBaseStyle } from '@/components/ui/focus-input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SelectField } from '@/components/ui/select-field';
import { FilledButton, ScreenScroll, ScreenShell, useScreenTheme } from '@/components/ui/screen-layout';
import { useCan } from '@/lib/entitlements/capabilities';
import { openHostCapabilityDenied } from '@/lib/entitlements/host-gate';
import { uploadEstateDocumentFile } from '@/lib/estate-document-storage';
import { generateUuidV4 } from '@/lib/id';
import { isRequired } from '@/lib/validators';
import { useAuthStore } from '@/store/auth-store';
import { useDocumentStore } from '@/store/document-store';
import { DOCUMENT_CATEGORIES, type DocumentCategory } from '@/types';

type PickedFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
};

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
  }, [allowed, docsPath, estateId, router]);

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
    } catch {
      Alert.alert(
        'Development build required',
        'Document picker was added after your last native build. Rebuild the Maison development client (npm run eas:dev:ios or eas:dev:android), install it, then try again.'
      );
    }
  }

  async function submit() {
    if (!isRequired(title)) {
      Alert.alert(t('common.required'), t('forms.documentTitle'));
      return;
    }
    if (!pickedFile) {
      Alert.alert(t('common.required'), t('forms.chooseFile'));
      return;
    }

    setUploading(true);
    const documentId = generateUuidV4();
    const uploadResult = await uploadEstateDocumentFile(estateId, documentId, pickedFile);
    setUploading(false);
    if (uploadResult.error) {
      Alert.alert(t('forms.uploadFailed'), uploadResult.error);
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
    <ScreenShell title={t('titles.uploadDocument')}>
      <ScreenScroll contentContainerStyle={styles.form} gap={16}>
        <View style={styles.field}>
          <ThemedText style={[inputBaseStyle.label, { color: colors.icon }]}>File</ThemedText>
          <TouchableOpacity
            style={[
              styles.filePicker,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
            onPress={() => void pickFile()}
            activeOpacity={0.7}
          >
            <IconSymbol name="doc.fill" size={20} color={colors.tint} />
            <ThemedText
              numberOfLines={1}
              style={{ flex: 1, color: pickedFile ? colors.text : colors.textSecondary }}
            >
              {pickedFile ? pickedFile.name : 'Choose a file'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <FocusInput label="Title" value={title} onChangeText={setTitle} />

        <FocusInput
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={styles.description}
        />

        <SelectField
          label="Category"
          value={category}
          options={DOCUMENT_CATEGORIES.map((cat) => ({
            value: cat,
            label: t(`documentsList.categories.${cat}`),
          }))}
          onChange={setCategory}
        />

        <FilledButton
          label={t('common.save')}
          onPress={() => void submit()}
          disabled={!title.trim() || !pickedFile}
          loading={uploading}
          style={{ marginTop: 20 }}
        />
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  form: { paddingTop: 8 },
  field: { gap: 6 },
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 50,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  description: { minHeight: 120 },
});
