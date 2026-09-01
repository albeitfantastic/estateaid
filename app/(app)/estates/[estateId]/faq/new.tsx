import { Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FocusInput } from '@/components/ui/focus-input';
import { FilledButton, ScreenScroll, ScreenShell } from '@/components/ui/screen-layout';
import { useFaqStore } from '@/store/faq-store';
import { generateUuidV4 } from '@/lib/id';
import { isRequired } from '@/lib/validators';

function paramString(v: string | string[] | undefined): string | undefined {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

export default function NewFaq() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ estateId: string }>();
  const estateId = paramString(params.estateId);
  const router = useRouter();
  const { addFaq, getFaqsByEstate } = useFaqStore();

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (saving) return;
    if (!estateId) {
      Alert.alert(t('common.error'), 'Missing property for this FAQ.');
      return;
    }
    if (!isRequired(question)) {
      Alert.alert('Required', 'Please enter a question.');
      return;
    }
    if (!isRequired(answer)) {
      Alert.alert('Required', 'Please enter an answer.');
      return;
    }
    const existing = getFaqsByEstate(estateId);
    const newId = generateUuidV4();
    setSaving(true);
    try {
      const { error } = await addFaq({
        id: newId,
        estateId,
        question: question.trim(),
        answer: answer.trim(),
        order: existing.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      if (error) {
        Alert.alert(t('common.error'), error);
        return;
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenShell title={t('titles.newFaq')}>
      <ScreenScroll contentContainerStyle={styles.form} gap={16}>
        <FocusInput label="Question" value={question} onChangeText={setQuestion} />

        <FocusInput
          label="Answer"
          value={answer}
          onChangeText={setAnswer}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={styles.answer}
        />

        <FilledButton
          label={t('common.save')}
          onPress={() => void submit()}
          disabled={!question.trim() || !answer.trim()}
          loading={saving}
          style={{ marginTop: 20 }}
        />
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  form: { paddingTop: 8 },
  answer: { minHeight: 120 },
});
