import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/empty-state';
import { FilledButton, ScreenScroll, ScreenShell } from '@/components/ui/screen-layout';

export default function SearchPlaceholder() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <ScreenShell title={t('searchPlaceholder.title')}>
      <ScreenScroll contentContainerStyle={styles.scroll} gap={16}>
        <EmptyState
          icon="magnifyingglass"
          title={t('searchPlaceholder.emptyTitle')}
          subtitle={t('searchPlaceholder.emptySub')}
        />
        <FilledButton
          label={t('searchPlaceholder.backHome')}
          onPress={() => router.replace('/(app)/home' as never)}
          style={{ marginTop: 20 }}
        />
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 8, flexGrow: 1 },
});
