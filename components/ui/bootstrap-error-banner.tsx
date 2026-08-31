import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { useScreenTheme } from '@/components/ui/screen-layout';
import { loadAllStores } from '@/lib/load-all-stores';
import { Radius, Layout } from '@/constants/theme';
import { useBootstrapStore } from '@/store/bootstrap-store';

/** Shown on tab roots when bootstrap fetches failed. Does not hide cached data. */
export function BootstrapErrorBanner() {
  const { t } = useTranslation();
  const { colors } = useScreenTheme();
  const error = useBootstrapStore((s) => s.error);
  const retrying = useBootstrapStore((s) => s.retrying);

  if (!error) return null;

  return (
    <View
      style={[styles.banner, { backgroundColor: colors.warning + '18', borderColor: colors.warning + '44' }]}
      accessibilityRole="alert"
    >
      <View style={styles.copy}>
        <ThemedText type="defaultSemiBold" style={styles.title}>
          {t('bootstrap.loadFailedTitle')}
        </ThemedText>
        <ThemedText style={[styles.body, { color: colors.textSecondary }]}>
          {t('bootstrap.loadFailedBody')}
        </ThemedText>
      </View>
      <TouchableOpacity
        onPress={() => void loadAllStores()}
        disabled={retrying}
        style={[styles.retry, { borderColor: colors.tint }]}
        accessibilityRole="button"
        accessibilityLabel={t('bootstrap.retry')}
        hitSlop={8}
      >
        {retrying ? (
          <ActivityIndicator size="small" color={colors.tint} />
        ) : (
          <ThemedText style={[styles.retryText, { color: colors.tint }]}>{t('bootstrap.retry')}</ThemedText>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
    marginHorizontal: Layout.screenPaddingX,
  },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 14 },
  body: { fontSize: 12, lineHeight: 16 },
  retry: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    minWidth: 72,
    alignItems: 'center',
  },
  retryText: { fontSize: 13, fontWeight: '600' },
});
