import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ScreenScroll, ScreenShell, SectionLabel, useScreenTheme } from '@/components/ui/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useFaqStore } from '@/store/faq-store';
import { isRequired } from '@/lib/validators';

export default function EditFaq() {
  const { t } = useTranslation();
  const { faqId } = useLocalSearchParams<{ faqId: string }>();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const { faqs, updateFaq } = useFaqStore();
  const faq = faqs.find((f) => f.id === faqId);

  const [question, setQuestion] = useState(faq?.question ?? '');
  const [answer, setAnswer] = useState(faq?.answer ?? '');

  if (!faq) return <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ThemedText>Not found.</ThemedText></ThemedView>;

  function submit() {
    if (!isRequired(question)) { Alert.alert('Required', 'Please enter a question.'); return; }
    if (!isRequired(answer)) { Alert.alert('Required', 'Please enter an answer.'); return; }
    updateFaq(faqId, { question: question.trim(), answer: answer.trim() });
    router.back();
  }

  return (
    <ScreenShell
      title={t('titles.editFaq')}
      headerRight={
        <TouchableOpacity onPress={submit}>
          <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 16 }}>Save</ThemedText>
        </TouchableOpacity>
      }
    >
      <ScreenScroll contentContainerStyle={styles.form} gap={20} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <SectionLabel>Question *</SectionLabel>
          <TextInput style={[styles.input, { color: colors.text, borderColor: colors.icon + '44' }]} value={question} onChangeText={setQuestion} multiline numberOfLines={2} textAlignVertical="top" />
        </View>
        <View style={styles.field}>
          <SectionLabel>Answer *</SectionLabel>
          <TextInput style={[styles.input, styles.answerInput, { color: colors.text, borderColor: colors.icon + '44' }]} value={answer} onChangeText={setAnswer} multiline numberOfLines={6} textAlignVertical="top" />
        </View>
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  form: { paddingTop: 8, gap: 20 },
  field: { gap: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, paddingTop: 12 },
  answerInput: { height: 140 },
});
