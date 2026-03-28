import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StatusBadge } from '@/components/ui/badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useTicketStore } from '@/store/ticket-store';
import { SEED_USERS } from '@/store/seed-data';
import { generateId } from '@/lib/id';
import { formatDate } from '@/lib/date-utils';
import { TicketStatus } from '@/types';

const STATUS_OPTIONS: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

export default function OwnerTicketThread() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const { tickets, addMessage, updateTicketStatus } = useTicketStore();
  const ticket = tickets.find((t) => t.id === ticketId);
  const [reply, setReply] = useState('');
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  if (!ticket) return <ThemedView style={styles.center}><ThemedText>Ticket not found.</ThemedText></ThemedView>;

  function sendReply() {
    if (!reply.trim()) return;
    addMessage(ticketId, { id: generateId(), ticketId, authorId: currentUser!.id, body: reply.trim(), createdAt: new Date().toISOString() });
    setReply('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  const guest = SEED_USERS.find((u) => u.id === ticket.guestId);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <ThemedText type="defaultSemiBold" style={styles.ticketTitle} numberOfLines={1}>{ticket.title}</ThemedText>
          <ThemedText style={[styles.guestName, { color: colors.icon }]}>{guest?.name}</ThemedText>
        </View>
        <TouchableOpacity onPress={() => setShowStatusPicker((v) => !v)}>
          <StatusBadge status={ticket.status} />
        </TouchableOpacity>
      </View>

      {showStatusPicker && (
        <View style={[styles.statusPicker, { backgroundColor: colors.background, borderColor: colors.icon + '33' }]}>
          <ThemedText style={[styles.statusPickerLabel, { color: colors.icon }]}>Change Status:</ThemedText>
          <View style={styles.statusOptions}>
            {STATUS_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.statusOpt, ticket.status === s && { backgroundColor: colors.tint }]}
                onPress={() => { updateTicketStatus(ticketId, s); setShowStatusPicker(false); }}
              >
                <ThemedText style={[styles.statusOptText, ticket.status === s && { color: '#fff' }]}>
                  {s.replace('_', ' ')}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={[styles.messages, { paddingBottom: 16 }]} onContentSizeChange={() => scrollRef.current?.scrollToEnd()}>
          {ticket.messages.map((msg) => {
            const isOwner = msg.authorId === currentUser?.id;
            const author = SEED_USERS.find((u) => u.id === msg.authorId);
            return (
              <View key={msg.id} style={[styles.msgRow, isOwner && styles.msgRowRight]}>
                {!isOwner && <Avatar name={author?.name ?? 'Guest'} size={32} />}
                <View style={[styles.bubble, { backgroundColor: isOwner ? colors.tint : colors.tint + '18' }, isOwner && styles.bubbleRight]}>
                  {!isOwner && <ThemedText style={styles.authorName}>{author?.name ?? 'Guest'}</ThemedText>}
                  <ThemedText style={[styles.msgText, isOwner && { color: '#fff' }]}>{msg.body}</ThemedText>
                  <ThemedText style={[styles.msgTime, isOwner ? { color: '#fff8' } : { color: colors.icon }]}>
                    {formatDate(msg.createdAt.slice(0, 10))}
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {ticket.status !== 'closed' && (
          <View style={[styles.inputBar, { borderTopColor: colors.icon + '22', paddingBottom: insets.bottom + 8, backgroundColor: colors.background }]}>
            <TextInput
              style={[styles.replyInput, { color: colors.text, backgroundColor: colors.tint + '11', borderColor: colors.icon + '33' }]}
              placeholder="Reply to guest…"
              placeholderTextColor={colors.icon}
              value={reply}
              onChangeText={setReply}
              multiline
            />
            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.tint }, !reply.trim() && styles.disabled]} onPress={sendReply} disabled={!reply.trim()}>
              <IconSymbol name="paperplane.fill" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  back: { padding: 4 },
  headerText: { flex: 1 },
  ticketTitle: { fontSize: 16 },
  guestName: { fontSize: 12 },
  statusPicker: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, gap: 8 },
  statusPickerLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusOptions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusOpt: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#94a3b855' },
  statusOptText: { fontSize: 12, fontWeight: '500' },
  messages: { paddingHorizontal: 16, gap: 12, paddingTop: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowRight: { flexDirection: 'row-reverse' },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 16, gap: 4 },
  bubbleRight: { borderBottomRightRadius: 4 },
  authorName: { fontSize: 11, fontWeight: '700', opacity: 0.6 },
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTime: { fontSize: 10 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 10, gap: 10, borderTopWidth: 1 },
  replyInput: { flex: 1, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
});
