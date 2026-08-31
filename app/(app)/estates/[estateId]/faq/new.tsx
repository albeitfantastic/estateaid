import { Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FocusInput } from '@/components/ui/focus-input';
import { ScreenScroll, ScreenShell, useScreenTheme } from '@/components/ui/screen-layout';
import { ThemedText } from '@/components/themed-text';
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
  const { colors } = useScreenTheme();
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
    <ScreenShell
      title={t('titles.newFaq')}
      headerRight={
        <TouchableOpacity onPress={submit} disabled={saving} accessibilityState={{ disabled: saving }}>
          <ThemedText
            style={{
              color: saving ? colors.icon : colors.tint,
              fontWeight: '600',
              fontSize: 16,
              opacity: saving ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </ThemedText>
        </TouchableOpacity>
      }
    >
      <ScreenScroll contentContainerStyle={styles.form} gap={20} keyboardShouldPersistTaps="handled">
        <FocusInput label="Question *" placeholder="What guests often ask…" value={question} onChangeText={setQuestion} multiline numberOfLines={2} textAlignVertical="top" style={styles.multiInput} />
        <FocusInput label="Answer *" placeholder="Your detailed answer…" value={answer} onChangeText={setAnswer} multiline numberOfLines={6} textAlignVertical="top" style={styles.answerInput} />
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  form: { paddingTop: 8, gap: 20 },
  multiInput: { height: 70, paddingTop: 14 },
  answerInput: { height: 150, paddingTop: 14 },
});
