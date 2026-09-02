import { Alert, Linking, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ScreenScroll, ScreenShell, FilledButton, useScreenTheme } from '@/components/ui/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useDocumentStore } from '@/store/document-store';
import { getEstateDocumentSignedUrl } from '@/lib/estate-document-storage';
import { useMarkInboxSeenOnFocus } from '@/store/inbox-seen-store';

export default function DocumentDetailScreen() {
  const { t } = useTranslation();
  const { docId } = useLocalSearchParams<{ estateId: string; docId: string }>();
  const { colors } = useScreenTheme();
  const doc = useDocumentStore((s) => s.documents.find((d) => d.id === docId));
  const [opening, setOpening] = useState(false);
  useMarkInboxSeenOnFocus('doc', docId);

  async function openFile() {
    if (!doc?.fileUri) {
      Alert.alert('No File', 'This document has no file attached.');
      return;
    }
    setOpening(true);
    const { url, error } = await getEstateDocumentSignedUrl(doc.fileUri);
    setOpening(false);
    if (error || !url) {
      Alert.alert('Could Not Open', error ?? 'Failed to generate a link for this file.');
      return;
    }
    void Linking.openURL(url);
  }

  if (!doc) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>Document not found.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScreenShell title={doc.title}>
      <ScreenScroll contentContainerStyle={styles.body} gap={16}>
        <View style={[styles.badge, { backgroundColor: colors.tint + '15' }]}>
          <ThemedText style={[styles.badgeText, { color: colors.tint }]}>
            {t(`documentsList.categories.${doc.category}`, { defaultValue: doc.category })}
          </ThemedText>
        </View>
        {doc.description ? (
          <ThemedText style={[styles.description, { color: colors.icon }]}>{doc.description}</ThemedText>
        ) : null}
        <FilledButton
          label={opening ? 'Opening…' : 'Open File'}
          icon="doc.fill"
          onPress={() => void openFile()}
          disabled={opening}
          loading={opening}
        />
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingTop: 8, gap: 16 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  description: { fontSize: 14, lineHeight: 20 },
});
