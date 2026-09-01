import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FilledButton, ScreenScroll, ScreenShell, useScreenTheme } from '@/components/ui/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { useFaqStore } from '@/store/faq-store';

export default function FaqScreen() {
  const { t } = useTranslation();
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const { getFaqsByEstate, deleteFaq, fetchFromSupabase } = useFaqStore();
  const faqs = getFaqsByEstate(estateId);
  const [expanded, setExpanded] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void fetchFromSupabase();
    }, [fetchFromSupabase])
  );

  function confirmDelete(id: string) {
    Alert.alert(t('faqList.deleteTitle'), t('faqList.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteFaq(id) },
    ]);
  }

  function goNew() {
    router.push(`/(app)/estates/${estateId}/faq/new` as never);
  }

  return (
    <ScreenShell title={t('titles.faq')}>
      <ScreenScroll contentContainerStyle={styles.scroll} gap={16}>
        {faqs.length === 0 ? (
          <EmptyState
            icon="questionmark.circle.fill"
            title={t('faqList.emptyTitle')}
            subtitle={t('faqList.emptySub')}
          />
        ) : (
          <View style={styles.list}>
            {faqs.map((faq) => (
            <View key={faq.id} style={[styles.card, { borderColor: colors.icon + '22', backgroundColor: colors.background }]}>
              <TouchableOpacity
                style={styles.questionRow}
                onPress={() => setExpanded(expanded === faq.id ? null : faq.id)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={expanded === faq.id ? t('a11y.collapse') : t('a11y.expand')}
              >
                <ThemedText type="defaultSemiBold" style={styles.question}>{faq.question}</ThemedText>
                <IconSymbol
                  name={expanded === faq.id ? 'xmark' : 'plus'}
                  size={16}
                  color={colors.icon}
                />
              </TouchableOpacity>
              {expanded === faq.id && (
                <View style={styles.answerSection}>
                  <ThemedText style={[styles.answer, { color: colors.text }]}>{faq.answer}</ThemedText>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      onPress={() => router.push(`/(app)/estates/${estateId}/faq/${faq.id}/edit` as never)}
                      accessibilityRole="button"
                      accessibilityLabel={t('a11y.edit')}
                    >
                      <IconSymbol name="pencil" size={18} color={colors.tint} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => confirmDelete(faq.id)}
                      accessibilityRole="button"
                      accessibilityLabel={t('a11y.delete')}
                    >
                      <IconSymbol name="trash" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
            ))}
          </View>
        )}

        <FilledButton
          label={t('faqList.addCta')}
          onPress={goNew}
          style={{ marginTop: 20 }}
        />
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 8 },
  list: { gap: 10 },
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  questionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  question: { flex: 1, fontSize: 15 },
  answerSection: { paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
  answer: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 16 },
});
