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
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { useTicketStore } from '@/store/ticket-store';
import { generateId } from '@/lib/id';
import { formatDate } from '@/lib/date-utils';

export default function GuestTicketThread() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const { tickets, addMessage } = useTicketStore();
  const profileById = useProfileStore((s) => s.byId);
  const ticket = tickets.find((t) => t.id === ticketId);
  const [reply, setReply] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  if (!ticket) return <ThemedView style={styles.center}><ThemedText>Ticket not found.</ThemedText></ThemedView>;

  function sendReply() {
    if (!reply.trim()) return;
    addMessage(ticketId, { id: generateId(), ticketId, authorId: currentUser!.id, body: reply.trim(), createdAt: new Date().toISOString() });
    setReply('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <ThemedText type="defaultSemiBold" style={styles.ticketTitle} numberOfLines={1}>{ticket.title}</ThemedText>
          <StatusBadge status={ticket.status} />
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <ScrollView ref={scrollRef} contentContainerStyle={[styles.messages, { paddingBottom: 16 }]} onContentSizeChange={() => scrollRef.current?.scrollToEnd()}>
          {ticket.messages.map((msg) => {
            const isMe = msg.authorId === currentUser?.id;
            const authorName = isMe
              ? (currentUser?.name ?? 'You')
              : resolveUserDisplayName(msg.authorId, profileById);
            return (
              <View key={msg.id} style={[styles.msgRow, isMe && styles.msgRowRight]}>
                {!isMe && <Avatar name={authorName} size={32} />}
                <View style={[styles.bubble, { backgroundColor: isMe ? colors.tint : colors.tint + '18' }, isMe && styles.bubbleRight]}>
                  {!isMe && <ThemedText style={styles.authorName}>{authorName}</ThemedText>}
                  <ThemedText style={[styles.msgText, isMe && { color: '#fff' }]}>{msg.body}</ThemedText>
                  <ThemedText style={[styles.msgTime, isMe ? { color: '#fff8' } : { color: colors.icon }]}>
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
              placeholder="Write a reply…"
              placeholderTextColor={colors.icon}
              value={reply}
              onChangeText={setReply}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: colors.tint }, !reply.trim() && styles.disabled]}
              onPress={sendReply}
              disabled={!reply.trim()}
            >
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
  headerText: { flex: 1, gap: 4 },
  ticketTitle: { fontSize: 16 },
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
