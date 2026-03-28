import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFaqStore } from '@/store/faq-store';

export default function OwnerFaq() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { getFaqsByEstate, deleteFaq } = useFaqStore();
  const faqs = getFaqsByEstate(estateId);
  const [expanded, setExpanded] = useState<string | null>(null);

  function confirmDelete(id: string) {
    Alert.alert('Delete FAQ', 'Remove this FAQ entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteFaq(id) },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>FAQ</ThemedText>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.tint }]}
          onPress={() => router.push(`/(owner)/estates/${estateId}/faq/new` as never)}
        >
          <IconSymbol name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {faqs.length === 0 ? (
        <EmptyState
          icon="questionmark.circle.fill"
          title="No FAQ entries yet"
          subtitle="Add frequently asked questions to help your guests."
          actionLabel="Add FAQ"
          onAction={() => router.push(`/(owner)/estates/${estateId}/faq/new` as never)}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}>
          {faqs.map((faq) => (
            <View key={faq.id} style={[styles.card, { borderColor: colors.icon + '22', backgroundColor: colors.background }]}>
              <TouchableOpacity
                style={styles.questionRow}
                onPress={() => setExpanded(expanded === faq.id ? null : faq.id)}
                activeOpacity={0.8}
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
                    <TouchableOpacity onPress={() => router.push(`/(owner)/estates/${estateId}/faq/${faq.id}/edit` as never)}>
                      <IconSymbol name="pencil" size={18} color={colors.tint} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete(faq.id)}>
                      <IconSymbol name="trash" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
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
  list: { paddingHorizontal: 20, gap: 10 },
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  questionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  question: { flex: 1, fontSize: 15 },
  answerSection: { paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
  answer: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 16 },
});
