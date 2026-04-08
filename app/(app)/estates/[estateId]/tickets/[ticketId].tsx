import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/avatar';
import { DueDatePickerModal } from '@/components/ui/due-date-picker-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StatusBadge } from '@/components/ui/badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Layout, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { useTicketStore } from '@/store/ticket-store';
import { generateId } from '@/lib/id';
import { formatDate } from '@/lib/date-utils';
import { TicketPriority, TicketStatus } from '@/types';

const STATUS_OPTIONS: TicketStatus[] = ['open', 'in_progress', 'resolved'];

const EDIT_PRIORITIES: { value: TicketPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#22c55e' },
  { value: 'normal', label: 'Normal', color: '#3b82f6' },
  { value: 'high', label: 'High', color: '#f59e0b' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
];

export default function OwnerTicketThread() {
  const { t } = useTranslation();
  const { ticketId, estateId } = useLocalSearchParams<{ ticketId: string; estateId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const getEstateById = useEstateStore((s) => s.getEstateById);
  const { tickets, addMessage, updateTicketStatus, updateTicket, deleteTicket } = useTicketStore();
  const profileById = useProfileStore((s) => s.byId);
  const ticket = tickets.find((tk) => tk.id === ticketId);
  const [reply, setReply] = useState('');
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [dueModalOpen, setDueModalOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<TicketPriority>('normal');
  const scrollRef = useRef<ScrollView>(null);

  const estate = estateId ? getEstateById(estateId) : undefined;
  const isOwner = !!(estate && currentUser && estate.ownerId === currentUser.id);

  if (!ticket) return <ThemedView style={styles.center}><ThemedText>Ticket not found.</ThemedText></ThemedView>;

  function sendReply() {
    if (!reply.trim()) return;
    addMessage(ticketId, { id: generateId(), ticketId, authorId: currentUser!.id, body: reply.trim(), createdAt: new Date().toISOString() });
    setReply('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  const guestName = resolveUserDisplayName(ticket.guestId, profileById);

  function openEditModal() {
    setEditTitle(ticket.title);
    setEditPriority(ticket.priority);
    setShowEditModal(true);
    setShowStatusPicker(false);
  }

  function saveEdits() {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      Alert.alert(t('common.error'), t('ticketsHub.threadTitleRequired'));
      return;
    }
    void updateTicket(ticketId, { title: trimmed, priority: editPriority });
    setShowEditModal(false);
  }

  function confirmDelete() {
    Alert.alert(t('ticketsHub.threadDeleteTitle'), t('ticketsHub.threadDeleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('ticketsHub.threadDeleteTicket'),
        style: 'destructive',
        onPress: () => {
          setShowEditModal(false);
          void deleteTicket(ticketId);
          router.back();
        },
      },
    ]);
  }

  const canReply = ticket.status !== 'resolved';

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <ThemedText type="defaultSemiBold" style={styles.ticketTitle} numberOfLines={1}>{ticket.title}</ThemedText>
          <ThemedText style={[styles.guestName, { color: colors.icon }]}>{guestName}</ThemedText>
        </View>
        {isOwner ? (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={openEditModal} style={styles.headerIconBtn} accessibilityRole="button" accessibilityLabel={t('ticketsHub.threadEditTicket')}>
              <IconSymbol name="pencil" size={20} color={colors.tint} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowStatusPicker((v) => !v)} accessibilityRole="button">
              <StatusBadge status={ticket.status} />
            </TouchableOpacity>
          </View>
        ) : (
          <StatusBadge status={ticket.status} />
        )}
      </View>

      {(isOwner || ticket.dueDate) && (
        <View style={[styles.dueRow, { borderBottomColor: colors.icon + '22' }]}>
          <View style={styles.dueRowText}>
            <ThemedText style={[styles.dueLabel, { color: colors.icon }]}>{t('ticketsHub.threadDueLabel')}</ThemedText>
            <ThemedText type="defaultSemiBold">
              {ticket.dueDate ? formatDate(ticket.dueDate) : t('ticketsHub.dueNone')}
            </ThemedText>
          </View>
          {isOwner ? (
            <TouchableOpacity onPress={() => setDueModalOpen(true)} style={styles.dueEditBtn}>
              <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 14 }}>
                {t('ticketsHub.threadSetDue')}
              </ThemedText>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {isOwner && showStatusPicker ? (
        <View style={[styles.statusPicker, { backgroundColor: colors.background, borderColor: colors.icon + '33' }]}>
          <ThemedText style={[styles.statusPickerLabel, { color: colors.icon }]}>
            {t('ticketsHub.threadChangeStatus')}
          </ThemedText>
          <View style={styles.statusOptions}>
            {STATUS_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.statusOpt, ticket.status === s && { backgroundColor: colors.tint }]}
                onPress={() => {
                  void updateTicketStatus(ticketId, s);
                  setShowStatusPicker(false);
                }}
              >
                <ThemedText style={[styles.statusOptText, ticket.status === s && { color: '#fff' }]}>
                  {s.replace('_', ' ')}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={[styles.messages, { paddingBottom: 16 }]} onContentSizeChange={() => scrollRef.current?.scrollToEnd()}>
          {ticket.messages.map((msg) => {
            const isOwner = msg.authorId === currentUser?.id;
            const authorName = isOwner
              ? (currentUser?.name ?? 'You')
              : resolveUserDisplayName(msg.authorId, profileById);
            return (
              <View key={msg.id} style={[styles.msgRow, isOwner && styles.msgRowRight]}>
                {!isOwner && <Avatar name={authorName} size={32} />}
                <View style={[styles.bubble, { backgroundColor: isOwner ? colors.tint : colors.tint + '18' }, isOwner && styles.bubbleRight]}>
                  {!isOwner && <ThemedText style={styles.authorName}>{authorName}</ThemedText>}
                  <ThemedText style={[styles.msgText, isOwner && { color: '#fff' }]}>{msg.body}</ThemedText>
                  <ThemedText style={[styles.msgTime, isOwner ? { color: '#fff8' } : { color: colors.icon }]}>
                    {formatDate(msg.createdAt.slice(0, 10))}
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {canReply ? (
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
        ) : null}
      </KeyboardAvoidingView>

      <Modal visible={showEditModal} animationType="fade" transparent onRequestClose={() => setShowEditModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowEditModal(false)}>
          <View
            style={[styles.modalCard, { backgroundColor: colors.background, borderColor: colors.icon + '33' }]}
            onStartShouldSetResponder={() => true}
          >
            <ThemedText type="defaultSemiBold" style={styles.modalTitle}>
              {t('titles.editTicket')}
            </ThemedText>
            <ThemedText style={[styles.modalLabel, { color: colors.icon }]}>{t('ticketsHub.threadEditTitleLabel')}</ThemedText>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.icon + '44' }]}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholderTextColor={colors.icon}
              placeholder={t('ticketsHub.threadEditTitleLabel')}
            />
            <ThemedText style={[styles.modalLabel, { color: colors.icon, marginTop: 12 }]}>{t('ticketsHub.threadEditPriority')}</ThemedText>
            <View style={styles.modalPriorityRow}>
              {EDIT_PRIORITIES.map((p) => {
                const selected = p.value === editPriority;
                return (
                  <TouchableOpacity
                    key={p.value}
                    style={[
                      styles.modalPriPill,
                      {
                        backgroundColor: selected ? p.color + '22' : colors.tint + '08',
                        borderColor: selected ? p.color : colors.icon + '33',
                      },
                    ]}
                    onPress={() => setEditPriority(p.value)}
                  >
                    <ThemedText style={[styles.modalPriText, selected && { color: p.color, fontWeight: '700' }]}>
                      {p.label}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.tint }]} onPress={saveEdits}>
              <ThemedText style={styles.modalSaveText}>{t('ticketsHub.threadSaveEdits')}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalDeleteBtn} onPress={confirmDelete}>
              <IconSymbol name="trash" size={18} color="#dc2626" />
              <ThemedText style={styles.modalDeleteText}>{t('ticketsHub.threadDeleteTicket')}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowEditModal(false)}>
              <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>{t('common.cancel')}</ThemedText>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {isOwner ? (
        <DueDatePickerModal
          visible={dueModalOpen}
          onClose={() => setDueModalOpen(false)}
          onSelectDate={(d) => void updateTicket(ticketId, { dueDate: d })}
          onClear={() => void updateTicket(ticketId, { dueDate: null })}
          title={t('ticketsHub.threadSetDue')}
          clearLabel={t('ticketsHub.threadClearDue')}
        />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, gap: 10 },
  back: { padding: 4 },
  headerText: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBtn: { padding: 6 },
  ticketTitle: { fontSize: 16 },
  guestName: { fontSize: 12 },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  dueRowText: { flex: 1, gap: 4 },
  dueLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  dueEditBtn: { paddingVertical: 4 },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: Layout.screenPaddingX,
  },
  modalCard: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 4,
  },
  modalTitle: { fontSize: 18, marginBottom: 8 },
  modalLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  modalInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  modalPriorityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modalPriPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  modalPriText: { fontSize: 13, fontWeight: '600' },
  modalSaveBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  modalSaveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalDeleteBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  modalDeleteText: { color: '#dc2626', fontWeight: '600', fontSize: 15 },
  modalCancelBtn: { marginTop: 4, paddingVertical: 10, alignItems: 'center' },
});
