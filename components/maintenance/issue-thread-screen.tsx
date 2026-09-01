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
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { useContext, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AddToCalendarButton } from '@/components/calendar/add-to-calendar-button';
import { Avatar } from '@/components/ui/avatar';
import { DueDatePickerModal } from '@/components/ui/due-date-picker-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StatusBadge } from '@/components/ui/badge';
import { ThemedText } from '@/components/themed-text';
import { FilledButton, ScreenShell, useScreenTheme } from '@/components/ui/screen-layout';
import { Layout, PriorityColors, Radius } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';
import { useContactStore } from '@/store/contact-store';
import { useEstateStore } from '@/store/estate-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { useEventStore } from '@/store/event-store';
import { useCan } from '@/lib/entitlements/capabilities';
import { generateId } from '@/lib/id';
import { formatDate, today } from '@/lib/date-utils';
import { userHasStayOnEstateOnDate } from '@/lib/stay-occupant';
import { useStayStore } from '@/store/stay-store';
import type { EstateContact, EstateEvent, IssuePriority, IssueStatus } from '@/types';

const STATUS_OPTIONS: IssueStatus[] = ['open', 'in_progress', 'resolved'];

const EDIT_PRIORITIES: { value: IssuePriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: PriorityColors.low },
  { value: 'normal', label: 'Normal', color: PriorityColors.normal },
  { value: 'high', label: 'High', color: PriorityColors.high },
  { value: 'urgent', label: 'Urgent', color: PriorityColors.urgent },
];

function contactLabel(c: EstateContact) {
  const role = c.role?.trim();
  return role ? `${c.name} · ${role}` : c.name;
}

type Props = { event: EstateEvent; estateId: string };

export function IssueThreadScreen({ event: initialEvent, estateId }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeightFromContext = useContext(BottomTabBarHeightContext);
  const tabBarHeight =
    typeof tabBarHeightFromContext === 'number' && tabBarHeightFromContext > 0
      ? tabBarHeightFromContext
      : 52;
  const { colors } = useScreenTheme();
  const can = useCan();
  const currentUser = useAuthStore((s) => s.currentUser);
  const getEstateById = useEstateStore((s) => s.getEstateById);
  const allContacts = useContactStore((s) => s.contacts);
  const events = useEventStore((s) => s.events);
  const addIssueMessage = useEventStore((s) => s.addIssueMessage);
  const updateIssueMessage = useEventStore((s) => s.updateIssueMessage);
  const updateIssueStatus = useEventStore((s) => s.updateIssueStatus);
  const updateIssueFields = useEventStore((s) => s.updateIssueFields);
  const deleteEvent = useEventStore((s) => s.deleteEvent);
  const stays = useStayStore((s) => s.stays);
  const profileById = useProfileStore((s) => s.byId);
  const eventId = initialEvent.id;
  const ticket = events.find((tk) => tk.id === eventId) ?? initialEvent;
  const [reply, setReply] = useState('');
  const [replyTaggedContactId, setReplyTaggedContactId] = useState<string | null>(null);
  const [dueModalOpen, setDueModalOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<IssuePriority>('normal');
  const [contactPickerVisible, setContactPickerVisible] = useState(false);
  const [contactPickerContext, setContactPickerContext] = useState<'reply' | 'edit'>('reply');
  const [editMessageDraft, setEditMessageDraft] = useState<{
    messageId: string;
    body: string;
    taggedContactId: string | null;
  } | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const estate = estateId ? getEstateById(estateId) : undefined;
  /** Host tools here follow `events.write`, so invited hosts and post-transfer sponsors qualify. */
  const isEstateOwner = !!estate && can('events.write', { estateId });

  const estateContacts = useMemo(() => {
    if (!estateId) return [];
    return allContacts
      .filter((c) => c.estateId === estateId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
  }, [allContacts, estateId]);

  const contactByIdMap = useMemo(() => {
    const map: Record<string, EstateContact> = {};
    estateContacts.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [estateContacts]);

  const activeTicket = ticket;
  const issueOpen = (activeTicket.status ?? 'open') !== 'resolved';
  const guestOnStay = userHasStayOnEstateOnDate(stays, currentUser?.id, estateId, today());
  const canReply = issueOpen && (isEstateOwner || guestOnStay);

  function openContactPicker(ctx: 'reply' | 'edit') {
    setContactPickerContext(ctx);
    setContactPickerVisible(true);
  }

  function applyPickedContact(contactId: string | null) {
    if (contactPickerContext === 'reply') {
      setReplyTaggedContactId(contactId);
    } else if (editMessageDraft) {
      setEditMessageDraft({ ...editMessageDraft, taggedContactId: contactId });
    }
    setContactPickerVisible(false);
  }

  function sendReply() {
    if (!canReply || !reply.trim()) return;
    void addIssueMessage(eventId, {
      id: generateId(),
      eventId,
      authorId: currentUser!.id,
      body: reply.trim(),
      createdAt: new Date().toISOString(),
      ...(replyTaggedContactId ? { taggedContactId: replyTaggedContactId } : {}),
    });
    setReply('');
    setReplyTaggedContactId(null);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  function saveEditedMessage() {
    if (!editMessageDraft) return;
    const trimmed = editMessageDraft.body.trim();
    if (!trimmed) {
      Alert.alert(t('common.error'), t('ticketsHub.threadMessageEmpty'));
      return;
    }
    void updateIssueMessage(eventId, editMessageDraft.messageId, {
      body: trimmed,
      taggedContactId: editMessageDraft.taggedContactId,
    });
    setEditMessageDraft(null);
  }

  const guestName = resolveUserDisplayName(activeTicket.guestId!, profileById);

  function openEditModal() {
    setEditTitle(activeTicket.title);
    setEditPriority(activeTicket.priority ?? 'normal');
    setShowEditModal(true);
  }

  function saveEdits() {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      Alert.alert(t('common.error'), t('ticketsHub.threadTitleRequired'));
      return;
    }
    void updateIssueFields(eventId, { title: trimmed, priority: editPriority });
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
          void deleteEvent(eventId);
          router.back();
        },
      },
    ]);
  }

  const taggedReplyContact = replyTaggedContactId ? contactByIdMap[replyTaggedContactId] : undefined;
  /** Tab bar is `position: 'absolute'` in (app) — without this, the composer sits under the bar. */
  const bottomComposerPad = tabBarHeight + insets.bottom + 10;

  return (
    <ScreenShell
      title={
        <View>
          <ThemedText type="defaultSemiBold" style={styles.ticketTitle} numberOfLines={1}>
            {activeTicket.title}
          </ThemedText>
          <ThemedText style={[styles.guestName, { color: colors.textSecondary }]}>{guestName}</ThemedText>
        </View>
      }
      headerRight={
        isEstateOwner ? (
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={openEditModal}
              style={styles.headerIconBtn}
              accessibilityRole="button"
              accessibilityLabel={t('ticketsHub.threadEditTicket')}
            >
              <IconSymbol name="pencil" size={20} color={colors.tint} />
            </TouchableOpacity>
            <View accessibilityRole="text" accessibilityLabel={t('ticketsHub.threadChangeStatus')}>
              <StatusBadge status={activeTicket.status ?? 'open'} />
            </View>
          </View>
        ) : (
          <StatusBadge status={activeTicket.status ?? 'open'} />
        )
      }
    >

      {(isEstateOwner || activeTicket.date) && (
        <View style={[styles.dueRow, { borderBottomColor: colors.icon + '22' }]}>
          <View style={styles.dueRowText}>
            <ThemedText style={[styles.dueLabel, { color: colors.icon }]}>{t('ticketsHub.threadDueLabel')}</ThemedText>
            <ThemedText type="defaultSemiBold">
              {activeTicket.date ? formatDate(activeTicket.date) : t('ticketsHub.dueNone')}
            </ThemedText>
          </View>
          {isEstateOwner ? (
            <TouchableOpacity onPress={() => setDueModalOpen(true)} style={styles.dueEditBtn}>
              <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 14 }}>
                {t('ticketsHub.threadSetDue')}
              </ThemedText>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {activeTicket.date ? (
        <View style={styles.calBtn}>
          <AddToCalendarButton event={activeTicket} />
        </View>
      ) : null}

      {isEstateOwner ? (
        <View style={[styles.statusPicker, { backgroundColor: colors.background, borderColor: colors.icon + '33' }]}>
          <ThemedText style={[styles.statusPickerLabel, { color: colors.icon }]}>
            {t('ticketsHub.threadChangeStatus')}
          </ThemedText>
          <View style={styles.statusOptions}>
            {STATUS_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.statusOpt,
                  { borderColor: colors.border },
                  (activeTicket.status ?? 'open') === s && { backgroundColor: colors.tint },
                ]}
                onPress={() => {
                  void updateIssueStatus(eventId, s);
                }}
              >
                <ThemedText
                  style={[
                    styles.statusOptText,
                    (activeTicket.status ?? 'open') === s && { color: colors.textOnBrand },
                  ]}
                >
                  {s.replace('_', ' ')}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.messages, { paddingBottom: 12 + bottomComposerPad }]}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd()}
        >
          {(activeTicket.messages ?? []).map((msg) => {
            const isOwnMessage = msg.authorId === currentUser?.id;
            const authorName = isOwnMessage
              ? (currentUser?.name ?? 'You')
              : resolveUserDisplayName(msg.authorId, profileById);
            const tagged = msg.taggedContactId ? contactByIdMap[msg.taggedContactId] : undefined;
            return (
              <View key={msg.id} style={[styles.msgRow, isOwnMessage && styles.msgRowRight]}>
                {!isOwnMessage && <Avatar name={authorName} size={32} />}
                <View style={styles.msgCol}>
                  {canReply && isOwnMessage && (
                    <TouchableOpacity
                      style={[styles.msgEditIcon, isOwnMessage && styles.msgEditIconRight]}
                      onPress={() =>
                        setEditMessageDraft({
                          messageId: msg.id,
                          body: msg.body,
                          taggedContactId: msg.taggedContactId ?? null,
                        })
                      }
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={t('ticketsHub.threadEditMessage')}
                    >
                      <IconSymbol name="pencil" size={14} color={colors.tint} />
                    </TouchableOpacity>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      { backgroundColor: isOwnMessage ? colors.tint : colors.tint + '18' },
                      isOwnMessage && styles.bubbleRight,
                    ]}
                  >
                    {!isOwnMessage && <ThemedText style={styles.authorName}>{authorName}</ThemedText>}
                    {msg.taggedContactId ? (
                      <View
                        style={[
                          styles.contactTag,
                          { backgroundColor: isOwnMessage ? colors.textOnBrand + '22' : colors.tint + '14' },
                        ]}
                      >
                        <IconSymbol name="person.fill" size={12} color={isOwnMessage ? colors.textOnBrand : colors.tint} />
                        <ThemedText
                          style={[styles.contactTagText, { color: isOwnMessage ? colors.textOnBrand : colors.tint }]}
                          numberOfLines={2}
                        >
                          {t('ticketsHub.threadTaggedPrefix')}:{' '}
                          {tagged ? contactLabel(tagged) : t('ticketsHub.threadContactRemoved')}
                        </ThemedText>
                      </View>
                    ) : null}
                    <ThemedText style={[styles.msgText, isOwnMessage && { color: colors.textOnBrand }]}>{msg.body}</ThemedText>
                    <ThemedText style={[styles.msgTime, isOwnMessage ? { color: colors.textOnBrand, opacity: 0.7 } : { color: colors.icon }]}>
                      {formatDate(msg.createdAt.slice(0, 10))}
                    </ThemedText>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {canReply ? (
          <View
            style={[
              styles.inputBar,
              {
                borderTopColor: colors.icon + '22',
                paddingBottom: bottomComposerPad,
                backgroundColor: colors.background,
              },
            ]}
          >
            {replyTaggedContactId ? (
              <View style={[styles.replyTagRow, { borderColor: colors.icon + '33' }]}>
                <IconSymbol name="person.fill" size={14} color={colors.tint} />
                <ThemedText style={[styles.replyTagText, { color: colors.text }]} numberOfLines={1}>
                  {taggedReplyContact ? contactLabel(taggedReplyContact) : replyTaggedContactId}
                </ThemedText>
                <TouchableOpacity onPress={() => setReplyTaggedContactId(null)} hitSlop={8}>
                  <IconSymbol name="xmark" size={16} color={colors.icon} />
                </TouchableOpacity>
              </View>
            ) : null}
            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.replyInput,
                  { color: colors.text, backgroundColor: colors.tint + '11', borderColor: colors.icon + '33' },
                ]}
                placeholder={t('ticketsHub.threadReplyPlaceholder')}
                placeholderTextColor={colors.icon}
                value={reply}
                onChangeText={setReply}
                multiline
              />
              <TouchableOpacity
                style={[styles.tagReplyBtn, { borderColor: colors.icon + '44' }]}
                onPress={() => openContactPicker('reply')}
                accessibilityRole="button"
                accessibilityLabel={t('ticketsHub.threadTagContact')}
              >
                <IconSymbol name="person.badge.plus" size={20} color={colors.tint} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: colors.tint }, !reply.trim() && styles.disabled]}
                onPress={sendReply}
                disabled={!reply.trim()}
              >
                <IconSymbol name="paperplane.fill" size={18} color={colors.textOnBrand} />
              </TouchableOpacity>
            </View>
          </View>
        ) : !isEstateOwner && issueOpen ? (
          <View
            style={[
              styles.inputBar,
              {
                borderTopColor: colors.icon + '22',
                paddingBottom: bottomComposerPad,
                backgroundColor: colors.background,
              },
            ]}
          >
            <ThemedText style={[styles.stayOnlyHint, { color: colors.textSecondary }]}>
              {t('estateHub.availableDuringStay')}
            </ThemedText>
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
            <ThemedText style={[styles.modalLabel, { color: colors.icon, marginTop: 12 }]}>
              {t('ticketsHub.threadEditPriority')}
            </ThemedText>
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
            <FilledButton label={t('ticketsHub.threadSaveEdits')} onPress={saveEdits} />
            <TouchableOpacity style={styles.modalDeleteBtn} onPress={confirmDelete}>
              <IconSymbol name="trash" size={18} color={colors.error} />
              <ThemedText style={[styles.modalDeleteText, { color: colors.error }]}>{t('ticketsHub.threadDeleteTicket')}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowEditModal(false)}>
              <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>{t('common.cancel')}</ThemedText>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={!!editMessageDraft}
        animationType="fade"
        transparent
        onRequestClose={() => setEditMessageDraft(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setEditMessageDraft(null)}>
          <View
            style={[styles.modalCard, { backgroundColor: colors.background, borderColor: colors.icon + '33' }]}
            onStartShouldSetResponder={() => true}
          >
            <ThemedText type="defaultSemiBold" style={styles.modalTitle}>
              {t('ticketsHub.threadEditMessage')}
            </ThemedText>
            <ThemedText style={[styles.modalLabel, { color: colors.icon }]}>{t('ticketsHub.threadMessageBodyLabel')}</ThemedText>
            <TextInput
              style={[styles.modalInput, styles.editMsgMultiline, { color: colors.text, borderColor: colors.icon + '44' }]}
              value={editMessageDraft?.body ?? ''}
              onChangeText={(text) =>
                editMessageDraft && setEditMessageDraft({ ...editMessageDraft, body: text })
              }
              placeholderTextColor={colors.icon}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.editMsgTagRow}>
              <ThemedText style={[styles.modalLabel, { color: colors.icon, marginBottom: 0, flex: 1 }]}>
                {t('ticketsHub.threadTagContact')}
              </ThemedText>
              <TouchableOpacity
                style={[styles.smallBtn, { borderColor: colors.tint }]}
                onPress={() => openContactPicker('edit')}
              >
                <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 13 }}>
                  {t('ticketsHub.threadPickContactTitle')}
                </ThemedText>
              </TouchableOpacity>
            </View>
            {editMessageDraft?.taggedContactId ? (
              <View style={[styles.replyTagRow, { borderColor: colors.icon + '33', marginBottom: 8 }]}>
                <IconSymbol name="person.fill" size={14} color={colors.tint} />
                <ThemedText style={[styles.replyTagText, { color: colors.text }]} numberOfLines={1}>
                  {contactByIdMap[editMessageDraft.taggedContactId]
                    ? contactLabel(contactByIdMap[editMessageDraft.taggedContactId])
                    : editMessageDraft.taggedContactId}
                </ThemedText>
                <TouchableOpacity
                  onPress={() =>
                    editMessageDraft &&
                    setEditMessageDraft({ ...editMessageDraft, taggedContactId: null })
                  }
                  hitSlop={8}
                >
                  <ThemedText style={{ color: colors.tint, fontSize: 13 }}>{t('ticketsHub.threadClearContactTag')}</ThemedText>
                </TouchableOpacity>
              </View>
            ) : null}
            <FilledButton label={t('ticketsHub.threadSaveMessage')} onPress={saveEditedMessage} />
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditMessageDraft(null)}>
              <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>{t('common.cancel')}</ThemedText>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={contactPickerVisible} animationType="slide" transparent>
        <Pressable style={styles.pickerOverlay} onPress={() => setContactPickerVisible(false)}>
          <View
            style={[styles.pickerSheet, { backgroundColor: colors.background, borderColor: colors.icon + '33' }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.pickerHeader, { borderBottomColor: colors.icon + '22' }]}>
              <ThemedText type="defaultSemiBold" style={{ fontSize: 17 }}>
                {t('ticketsHub.threadPickContactTitle')}
              </ThemedText>
              <TouchableOpacity onPress={() => setContactPickerVisible(false)} hitSlop={12}>
                <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>{t('common.close')}</ThemedText>
              </TouchableOpacity>
            </View>
            {((contactPickerContext === 'reply' && replyTaggedContactId) ||
              (contactPickerContext === 'edit' && editMessageDraft?.taggedContactId)) ? (
              <TouchableOpacity
                style={[styles.pickerClearRow, { borderBottomColor: colors.icon + '11' }]}
                onPress={() => applyPickedContact(null)}
              >
                <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>{t('ticketsHub.threadClearContactTag')}</ThemedText>
              </TouchableOpacity>
            ) : null}
            <ScrollView style={styles.pickerScroll} keyboardShouldPersistTaps="handled">
              {estateContacts.length === 0 ? (
                <ThemedText style={[styles.pickerEmpty, { color: colors.icon }]}>
                  {t('ticketsHub.threadNoContacts')}
                </ThemedText>
              ) : (
                estateContacts.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.pickerRow, { borderBottomColor: colors.icon + '11' }]}
                    onPress={() => applyPickedContact(c.id)}
                  >
                    <ThemedText type="defaultSemiBold" numberOfLines={1}>
                      {c.name}
                    </ThemedText>
                    {c.role ? (
                      <ThemedText style={{ color: colors.icon, fontSize: 13 }} numberOfLines={1}>
                        {c.role}
                      </ThemedText>
                    ) : null}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {isEstateOwner ? (
        <DueDatePickerModal
          visible={dueModalOpen}
          onClose={() => setDueModalOpen(false)}
          onSelectDate={(d) => void updateIssueFields(eventId, { date: d })}
          onClear={() => void updateIssueFields(eventId, { date: null })}
          title={t('ticketsHub.threadSetDue')}
          clearLabel={t('ticketsHub.threadClearDue')}
        />
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
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
  calBtn: { paddingHorizontal: Layout.screenPaddingX, paddingVertical: 12 },
  statusPicker: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, gap: 8 },
  statusPickerLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusOptions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusOpt: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  statusOptText: { fontSize: 12, fontWeight: '500' },
  messages: { paddingHorizontal: 16, gap: 12, paddingTop: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowRight: { flexDirection: 'row-reverse' },
  msgCol: { maxWidth: '75%', position: 'relative' },
  msgEditIcon: { position: 'absolute', top: -4, zIndex: 2, padding: 4 },
  msgEditIconRight: { right: 4 },
  bubble: { padding: 12, borderRadius: 16, gap: 4 },
  bubbleRight: { borderBottomRightRadius: 4 },
  contactTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8 },
  contactTagText: { flex: 1, fontSize: 12, fontWeight: '600' },
  authorName: { fontSize: 11, fontWeight: '700', opacity: 0.6 },
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTime: { fontSize: 10 },
  inputBar: { paddingHorizontal: 16, paddingTop: 10, gap: 8, borderTopWidth: 1 },
  stayOnlyHint: { fontSize: 14, lineHeight: 20, paddingBottom: 4 },
  replyTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  replyTagText: { flex: 1, fontSize: 13 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  replyInput: { flex: 1, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  tagReplyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  editMsgMultiline: { minHeight: 100, paddingTop: 12 },
  editMsgTagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1 },
  modalPriorityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modalPriPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  modalPriText: { fontSize: 13, fontWeight: '600' },
  modalDeleteBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  modalDeleteText: { fontWeight: '600', fontSize: 15 },
  modalCancelBtn: { marginTop: 4, paddingVertical: 10, alignItems: 'center' },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    maxHeight: '72%',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingBottom: 24,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerClearRow: { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  pickerScroll: { maxHeight: 400 },
  pickerRow: { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
  pickerEmpty: { padding: 24, fontSize: 14, lineHeight: 20 },
});
