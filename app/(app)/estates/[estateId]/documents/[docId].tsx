import { Alert, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDocumentStore } from '@/store/document-store';
import { getEstateDocumentSignedUrl } from '@/lib/estate-document-storage';

const CATEGORY_LABELS: Record<string, string> = {
  guide: 'Guide',
  manual: 'Manual',
  rule: 'House Rules',
  emergency: 'Emergency',
  other: 'Other',
};

export default function DocumentDetailScreen() {
  const { docId } = useLocalSearchParams<{ estateId: string; docId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const doc = useDocumentStore((s) => s.documents.find((d) => d.id === docId));
  const [opening, setOpening] = useState(false);

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
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title} numberOfLines={1}>{doc.title}</ThemedText>
      </View>

      <View style={styles.body}>
        <View style={[styles.badge, { backgroundColor: colors.tint + '15' }]}>
          <ThemedText style={[styles.badgeText, { color: colors.tint }]}>
            {CATEGORY_LABELS[doc.category] ?? doc.category}
          </ThemedText>
        </View>
        {doc.description && (
          <ThemedText style={[styles.description, { color: colors.icon }]}>{doc.description}</ThemedText>
        )}
        <TouchableOpacity
          style={[styles.openBtn, { backgroundColor: colors.tint }]}
          onPress={() => void openFile()}
          disabled={opening}
          activeOpacity={0.85}
        >
          <IconSymbol name="doc.fill" size={18} color="#fff" />
          <ThemedText style={styles.openBtnText}>{opening ? 'Opening…' : 'Open File'}</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 22, fontWeight: '700' },
  body: { paddingHorizontal: 20, gap: 16 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  description: { fontSize: 14, lineHeight: 20 },
  openBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 16, marginTop: 8 },
  openBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
