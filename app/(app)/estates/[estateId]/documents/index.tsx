import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  FilledButton,
  GroupedList,
  GroupedRow,
  ScreenScroll,
  ScreenShell,
  SectionLabel,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { useCan } from '@/lib/entitlements/capabilities';
import { openHostCapabilityDenied } from '@/lib/entitlements/host-gate';
import { useDocumentStore } from '@/store/document-store';
import { DOCUMENT_CATEGORIES } from '@/types';

export default function DocumentsScreen() {
  const { t } = useTranslation();
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const canUpload = useCan()('documents.upload', { estateId });
  const { colors } = useScreenTheme();
  const { getDocumentsByEstate, deleteDocument } = useDocumentStore();
  const docs = getDocumentsByEstate(estateId);

  const grouped = DOCUMENT_CATEGORIES.map((cat) => ({
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
    Alert.alert(t('documentsList.deleteTitle'), t('documentsList.deleteBody', { title }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteDocument(id) },
    ]);
  }

  return (
    <ScreenShell title={t('titles.documents')}>
      <ScreenScroll contentContainerStyle={styles.scroll} gap={16}>
        {docs.length === 0 ? (
          <EmptyState
            icon="doc.fill"
            title={t('documentsList.emptyTitle')}
            subtitle={t('documentsList.emptySub')}
          />
        ) : (
          grouped.map(({ cat, docs: catDocs }) => (
            <View key={cat}>
              <SectionLabel>{t(`documentsList.categories.${cat}`)}</SectionLabel>
              <GroupedList>
                {catDocs.map((doc, i) => (
                  <GroupedRow
                    key={doc.id}
                    icon="doc.fill"
                    title={doc.title}
                    subtitle={doc.description}
                    trailing={
                      <TouchableOpacity
                        onPress={() => confirmDelete(doc.id, doc.title)}
                        style={styles.del}
                        accessibilityRole="button"
                        accessibilityLabel={t('a11y.delete')}
                      >
                        <IconSymbol name="trash" size={16} color={colors.error} />
                      </TouchableOpacity>
                    }
                    onPress={() => router.push(`/(app)/estates/${estateId}/documents/${doc.id}` as never)}
                    isLast={i === catDocs.length - 1}
                  />
                ))}
              </GroupedList>
            </View>
          ))
        )}

        <FilledButton
          label={t('documentsList.uploadCta')}
          onPress={goUpload}
          style={{ marginTop: 20 }}
        />
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 8 },
  del: { padding: 4 },
});
