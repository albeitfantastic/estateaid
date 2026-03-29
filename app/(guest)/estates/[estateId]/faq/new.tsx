import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFaqStore } from '@/store/faq-store';
import { generateId } from '@/lib/id';
import { isRequired } from '@/lib/validators';

export default function NewFaq() {
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
        <ThemedText type="title" style={styles.title}>New FAQ</ThemedText>
        <TouchableOpacity onPress={submit}>
          <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 16 }}>Save</ThemedText>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Question *</ThemedText>
          <TextInput style={[styles.input, { color: colors.text, borderColor: colors.icon + '44' }]} placeholder="What guests often ask…" placeholderTextColor={colors.icon} value={question} onChangeText={setQuestion} multiline numberOfLines={2} textAlignVertical="top" />
        </View>
        <View style={styles.field}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Answer *</ThemedText>
          <TextInput style={[styles.input, styles.answerInput, { color: colors.text, borderColor: colors.icon + '44' }]} placeholder="Your detailed answer…" placeholderTextColor={colors.icon} value={answer} onChangeText={setAnswer} multiline numberOfLines={6} textAlignVertical="top" />
        </View>
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
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, paddingTop: 12 },
  answerInput: { height: 140 },
});
