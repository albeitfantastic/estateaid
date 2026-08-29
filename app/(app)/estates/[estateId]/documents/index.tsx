import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/empty-state';
import { HostProLockTouchable } from '@/components/ui/host-pro-lock';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionHeader } from '@/components/ui/section-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCan } from '@/lib/entitlements/capabilities';
import { openHostCapabilityDenied } from '@/lib/entitlements/host-gate';
import { useDocumentStore } from '@/store/document-store';
import { DocumentCategory } from '@/types';

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  guide: 'Guides',
  manual: 'Manuals',
  rule: 'House Rules',
  emergency: 'Emergency',
  other: 'Other',
};
const CATEGORY_ORDER: DocumentCategory[] = ['emergency', 'rule', 'guide', 'manual', 'other'];

export default function DocumentsScreen() {
  const { t } = useTranslation();
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const canUpload = useCan()('documents.upload', { estateId });
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { getDocumentsByEstate, deleteDocument } = useDocumentStore();
  const docs = getDocumentsByEstate(estateId);

  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    docs: docs.filter((d) => d.category === cat),
  })).filter((g) => g.docs.length > 0);

  function goUpload() {
    if (!canUpload) {
      openHostCapabilityDenied(estateId, 'documents.upload', `/(app)/estates/${estateId}/documents`);
      return;
    }
    router.push(`/(app)/estates/${estateId}/documents/upload` as never);
  }

  function confirmDelete(id: string, title: string) {
    Alert.alert('Delete Document', `Remove "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDocument(id) },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>{t('titles.documents')}</ThemedText>
        <HostProLockTouchable
          locked={!canUpload}
          feature="documents.upload"
          returnTo={`/(app)/estates/${estateId}/documents`}
          shrinkToContent
          onPress={goUpload}
          style={[styles.addBtn, { backgroundColor: colors.tint }]}
        >
          <IconSymbol name="plus" size={20} color="#fff" />
        </HostProLockTouchable>
      </View>

      {docs.length === 0 ? (
        <EmptyState
          icon="doc.fill"
          title="No documents yet"
          subtitle="Upload guides, manuals, and rules for your guests."
          actionLabel="Upload"
          onAction={goUpload}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}>
          {grouped.map(({ cat, docs: catDocs }) => (
            <View key={cat}>
              <SectionHeader title={CATEGORY_LABELS[cat]} />
              {catDocs.map((doc) => (
                <TouchableOpacity
                  key={doc.id}
                  style={[styles.row, { borderColor: colors.icon + '22', backgroundColor: colors.background }]}
                  onPress={() => router.push(`/(app)/estates/${estateId}/documents/${doc.id}` as never)}
                  activeOpacity={0.8}
                >
                  <IconSymbol name="doc.fill" size={24} color={colors.tint} />
                  <View style={styles.info}>
                    <ThemedText type="defaultSemiBold" numberOfLines={1}>{doc.title}</ThemedText>
                    {doc.description && <ThemedText style={[styles.sub, { color: colors.icon }]} numberOfLines={1}>{doc.description}</ThemedText>}
                  </View>
                  <TouchableOpacity onPress={() => confirmDelete(doc.id, doc.title)} style={styles.del}>
                    <IconSymbol name="trash" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 28, fontWeight: '700' },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  list: {},
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, padding: 14, borderBottomWidth: 1, gap: 12 },
  info: { flex: 1, gap: 2 },
  sub: { fontSize: 12 },
  del: { padding: 4 },
});
