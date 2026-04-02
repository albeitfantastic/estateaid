import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { FocusInput } from '@/components/ui/focus-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFaqStore } from '@/store/faq-store';
import { generateId } from '@/lib/id';
import { isRequired } from '@/lib/validators';

export default function NewFaq() {
  const { t } = useTranslation();
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { addFaq, getFaqsByEstate } = useFaqStore();

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  function submit() {
    if (!isRequired(question)) { Alert.alert('Required', 'Please enter a question.'); return; }
    if (!isRequired(answer)) { Alert.alert('Required', 'Please enter an answer.'); return; }
    const existing = getFaqsByEstate(estateId);
    addFaq({ id: generateId(), estateId, question: question.trim(), answer: answer.trim(), order: existing.length, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>{t('titles.newFaq')}</ThemedText>
        <TouchableOpacity onPress={submit}>
          <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 16 }}>Save</ThemedText>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        <FocusInput label="Question *" placeholder="What guests often ask…" value={question} onChangeText={setQuestion} multiline numberOfLines={2} textAlignVertical="top" style={styles.multiInput} />
        <FocusInput label="Answer *" placeholder="Your detailed answer…" value={answer} onChangeText={setAnswer} multiline numberOfLines={6} textAlignVertical="top" style={styles.answerInput} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 24, fontWeight: '700' },
  form: { paddingHorizontal: 20, gap: 20, paddingTop: 8 },
  multiInput: { height: 70, paddingTop: 14 },
  answerInput: { height: 150, paddingTop: 14 },
});
