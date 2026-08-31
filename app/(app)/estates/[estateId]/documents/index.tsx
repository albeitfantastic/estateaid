import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/empty-state';
import { HostProLockTouchable } from '@/components/ui/host-pro-lock';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
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
import { DocumentCategory } from '@/types';

const CATEGORY_KEYS: Record<DocumentCategory, string> = {
  guide: 'documentsList.categories.guide',
  manual: 'documentsList.categories.manual',
  rule: 'documentsList.categories.rule',
  emergency: 'documentsList.categories.emergency',
  other: 'documentsList.categories.other',
};
const CATEGORY_ORDER: DocumentCategory[] = ['emergency', 'rule', 'guide', 'manual', 'other'];

export default function DocumentsScreen() {
  const { t } = useTranslation();
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const canUpload = useCan()('documents.upload', { estateId });
  const { colors } = useScreenTheme();
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
    Alert.alert(t('documentsList.deleteTitle'), t('documentsList.deleteBody', { title }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteDocument(id) },
    ]);
  }

  return (
    <ScreenShell
      title={t('titles.documents')}
      headerRight={
        <HostProLockTouchable
          locked={!canUpload}
          feature="documents.upload"
          returnTo={`/(app)/estates/${estateId}/documents`}
          shrinkToContent
          accessibilityRole="button"
          accessibilityLabel={t('documentsList.uploadCta')}
          onPress={goUpload}
          style={[styles.addBtn, { backgroundColor: colors.tint }]}
        >
          <IconSymbol name="plus" size={20} color={colors.textOnBrand} />
        </HostProLockTouchable>
      }
    >
      {docs.length === 0 ? (
        <EmptyState
          icon="doc.fill"
          title={t('documentsList.emptyTitle')}
          subtitle={t('documentsList.emptySub')}
          actionLabel={t('documentsList.uploadCta')}
          onAction={goUpload}
        />
      ) : (
        <ScreenScroll>
          {grouped.map(({ cat, docs: catDocs }) => (
            <View key={cat}>
              <SectionLabel marginTop={cat !== grouped[0]?.cat ? 16 : 0}>{t(CATEGORY_KEYS[cat])}</SectionLabel>
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
          ))}
        </ScreenScroll>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  del: { padding: 4 },
});
