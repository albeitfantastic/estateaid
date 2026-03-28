import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, EstateColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useTicketStore } from '@/store/ticket-store';
import { TicketPriority } from '@/types';
import { generateId } from '@/lib/id';

const PRIORITIES: { value: TicketPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#22c55e' },
  { value: 'normal', label: 'Normal', color: '#3b82f6' },
  { value: 'high', label: 'High', color: '#f59e0b' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
];

export default function NewTicket() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const { createTicket } = useTicketStore();

  const estates = useMemo(
    () => allEstates.filter((e) => e.ownerId === currentUser?.id),
    [allEstates, currentUser?.id]
  );

  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(
    estates.length === 1 ? estates[0].id : null
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('normal');

  const canSubmit = !!selectedEstateId && title.trim().length > 0;

  function submit() {
    if (!selectedEstateId) { Alert.alert('Required', 'Please select a property.'); return; }
    if (!title.trim()) { Alert.alert('Required', 'Please enter a title.'); return; }

    const now = new Date().toISOString();
    const ticketId = generateId();
    createTicket({
      id: ticketId,
      estateId: selectedEstateId,
      guestId: currentUser!.id,
      title: title.trim(),
      status: 'open',
      priority,
      messages: description.trim()
        ? [
            {
              id: generateId(),
              ticketId,
              authorId: currentUser!.id,
              body: description.trim(),
              createdAt: now,
            },
          ]
        : [],
      createdAt: now,
      updatedAt: now,
    });
    Alert.alert('Ticket Created', 'The ticket has been opened.');
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>New Ticket</ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Estate picker */}
        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Property</ThemedText>
          <View style={styles.pillRow}>
            {estates.map((e, i) => {
              const selected = e.id === selectedEstateId;
              const dotColor = EstateColors[i % EstateColors.length];
              return (
                <TouchableOpacity
                  key={e.id}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: selected ? dotColor + '22' : colors.background,
                      borderColor: selected ? dotColor : colors.icon + '33',
                    },
                  ]}
                  onPress={() => setSelectedEstateId(e.id)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.dot, { backgroundColor: dotColor }]} />
                  <ThemedText style={[styles.pillText, selected && { color: dotColor, fontWeight: '600' }]}>
                    {e.name}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Title</ThemedText>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.icon + '44' }]}
            placeholder="Brief summary of the issue"
            placeholderTextColor={colors.icon}
            value={title}
            onChangeText={setTitle}
            returnKeyType="next"
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Description (optional)</ThemedText>
          <TextInput
            style={[styles.input, styles.multiline, { color: colors.text, borderColor: colors.icon + '44' }]}
            placeholder="More details about the issue…"
            placeholderTextColor={colors.icon}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Priority */}
        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Priority</ThemedText>
          <View style={styles.priorityRow}>
            {PRIORITIES.map((p) => {
              const selected = p.value === priority;
              return (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.priorityPill,
                    {
                      backgroundColor: selected ? p.color + '22' : colors.background,
                      borderColor: selected ? p.color : colors.icon + '33',
                    },
                  ]}
                  onPress={() => setPriority(p.value)}
                  activeOpacity={0.75}
                >
                  <ThemedText style={[styles.priorityText, selected && { color: p.color, fontWeight: '700' }]}>
                    {p.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.tint }, !canSubmit && styles.disabled]}
          onPress={submit}
          disabled={!canSubmit}
          activeOpacity={0.8}
        >
          <IconSymbol name="ticket.fill" size={18} color="#fff" />
          <ThemedText style={styles.submitText}>Open Ticket</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 24, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, gap: 24, paddingTop: 4 },
  section: { gap: 10 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontSize: 14 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  multiline: { height: 100, paddingTop: 12 },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityPill: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 20, borderWidth: 1.5 },
  priorityText: { fontSize: 13 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 14, marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.45 },
});
