import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useTicketStore } from '@/store/ticket-store';
import { generateId } from '@/lib/id';
import { isRequired } from '@/lib/validators';
import { TicketPriority } from '@/types';

const PRIORITIES: TicketPriority[] = ['low', 'normal', 'high', 'urgent'];
const PRIORITY_COLORS: Record<TicketPriority, string> = { low: '#94a3b8', normal: '#0a7ea4', high: '#f59e0b', urgent: '#ef4444' };

export default function NewTicket() {
  const { t } = useTranslation();
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const createTicket = useTicketStore((s) => s.createTicket);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('normal');

  function submit() {
    if (!isRequired(title)) { Alert.alert('Required', 'Please enter a title for the issue.'); return; }
    if (!isRequired(body)) { Alert.alert('Required', 'Please describe the issue.'); return; }
    const now = new Date().toISOString();
    const ticketId = generateId();
    createTicket({
      id: ticketId,
      estateId,
      guestId: currentUser!.id,
      title: title.trim(),
      status: 'open',
      priority,
      messages: [{
        id: generateId(),
        ticketId,
        authorId: currentUser!.id,
        body: body.trim(),
        createdAt: now,
      }],
      createdAt: now,
      updatedAt: now,
    });
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>{t('titles.raiseIssue')}</ThemedText>
        <TouchableOpacity onPress={submit}>
          <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 16 }}>Submit</ThemedText>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Issue Title *</ThemedText>
          <TextInput style={[styles.input, { color: colors.text, borderColor: colors.icon + '44' }]} placeholder="e.g. Pool heater not working" placeholderTextColor={colors.icon} value={title} onChangeText={setTitle} />
        </View>
        <View style={styles.field}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Priority</ThemedText>
          <View style={styles.pills}>
            {PRIORITIES.map((p) => (
              <TouchableOpacity key={p} style={[styles.pill, { borderColor: PRIORITY_COLORS[p] + '88' }, priority === p && { backgroundColor: PRIORITY_COLORS[p] }]} onPress={() => setPriority(p)}>
                <ThemedText style={[styles.pillText, { color: priority === p ? '#fff' : PRIORITY_COLORS[p] }]}>{p.charAt(0).toUpperCase() + p.slice(1)}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.field}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Description *</ThemedText>
          <TextInput style={[styles.input, styles.multi, { color: colors.text, borderColor: colors.icon + '44' }]} placeholder="Describe the issue in detail…" placeholderTextColor={colors.icon} value={body} onChangeText={setBody} multiline numberOfLines={5} textAlignVertical="top" />
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
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  multi: { height: 120, paddingTop: 12 },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 13, fontWeight: '600' },
});
