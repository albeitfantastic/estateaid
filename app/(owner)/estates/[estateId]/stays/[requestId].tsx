import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { DateRangePicker } from '@/components/ui/date-range-picker';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StatusBadge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { useStayStore } from '@/store/stay-store';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { getPushToken, sendPush } from '@/lib/notifications';
import { formatDateRange, nightCount } from '@/lib/date-utils';

export default function ReviewStayRequest() {
  const { t } = useTranslation();
  const { estateId, requestId } = useLocalSearchParams<{ estateId: string; requestId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { stayRequests, approveStay, declineStay, proposeAlternative, askQuestion, hasConflict } = useStayStore();
  const profileById = useProfileStore((s) => s.byId);
  const currentUser = useAuthStore((s) => s.currentUser);
  const estate = useEstateStore((s) => s.estates.find((e) => e.id === estateId));
  const isReadOnly = !estate || estate.ownerId !== currentUser?.id;
  const estateName = estate?.name ?? 'the estate';
  const ownerName = currentUser?.name ?? 'The owner';

  const req = stayRequests.find((r) => r.id === requestId);
  const guestName = req ? resolveUserDisplayName(req.guestId, profileById) : '';

  const [ownerNote, setOwnerNote] = useState(req?.ownerNote ?? '');
  const [altFrom, setAltFrom] = useState<string | null>(req?.alternativeFrom ?? null);
  const [altTo, setAltTo] = useState<string | null>(req?.alternativeTo ?? null);
  const [showAltPicker, setShowAltPicker] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);

  if (!req) {
    return (
      <ThemedView style={styles.center}><ThemedText>Request not found.</ThemedText></ThemedView>
    );
  }

  const conflict = hasConflict(estateId, req.requestedFrom, req.requestedTo, requestId);
  const isPending = req.status === 'pending';

  function notifyGuest(title: string, body: string) {
    if (!req) return;
    void getPushToken(req.guestId).then((token) =>
      sendPush(token, title, body, { estateId, requestId })
    );
  }

  function onApprove() {
    const result = approveStay(requestId, ownerNote || undefined);
    if (!result.success) {
      Alert.alert('Cannot Approve', 'These dates conflict with an existing approved stay. Please decline or propose alternative dates.');
    } else {
      notifyGuest('Stay Approved', `Your stay request at ${estateName} was approved.`);
      router.back();
    }
  }

  function onDecline() {
    Alert.alert('Decline Request', 'Decline this stay request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline', style: 'destructive', onPress: () => {
          declineStay(requestId, ownerNote || undefined);
          notifyGuest('Stay Declined', `Your stay request at ${estateName} was declined.`);
          router.back();
        },
      },
    ]);
  }

  function onProposeAlternative() {
    if (!altFrom || !altTo) { Alert.alert('Required', 'Please select alternative dates.'); return; }
    proposeAlternative(requestId, altFrom, altTo, ownerNote || undefined);
    notifyGuest('Alternative Dates Proposed', `${ownerName} proposed new dates for your stay at ${estateName}.`);
    router.back();
  }

  function onAskQuestion() {
    if (!ownerNote.trim()) { Alert.alert('Required', 'Please enter your question.'); return; }
    askQuestion(requestId, ownerNote.trim());
    notifyGuest('Question from Owner', `${ownerName} has a question about your stay at ${estateName}.`);
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>{t('titles.stayRequest')}</ThemedText>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        {isReadOnly && (
          <View style={[styles.readOnlyBanner, { backgroundColor: colors.icon + '12', borderColor: colors.icon + '30' }]}>
            <IconSymbol name="info.circle.fill" size={15} color={colors.icon} />
            <ThemedText style={[styles.readOnlyText, { color: colors.icon }]}>
              Admin view — contact the estate owner to manage this request.
            </ThemedText>
          </View>
        )}
        {/* Guest info */}
        <View style={[styles.guestCard, { borderColor: colors.icon + '22', backgroundColor: colors.background }]}>
          <Avatar name={guestName} size={48} color={colors.tint} />
          <View style={styles.guestInfo}>
            <ThemedText type="defaultSemiBold" style={styles.guestName}>{guestName}</ThemedText>
          </View>
          <StatusBadge status={req.status} />
        </View>

        {/* Requested dates */}
        <View style={[styles.section, { borderColor: colors.icon + '22' }]}>
          <ThemedText style={[styles.sectionLabel, { color: colors.icon }]}>Requested Dates</ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.datesText}>
            {formatDateRange(req.requestedFrom, req.requestedTo)}
          </ThemedText>
          <ThemedText style={[styles.nights, { color: colors.icon }]}>
            {nightCount(req.requestedFrom, req.requestedTo)} nights
          </ThemedText>
          {conflict && (
            <View style={[styles.conflictAlert, { backgroundColor: '#f59e0b18', borderColor: '#f59e0b55' }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={14} color="#f59e0b" />
              <ThemedText style={styles.conflictText}>
                These dates conflict with an existing approved stay.
              </ThemedText>
            </View>
          )}
        </View>

        {req.guestNote && (
          <View style={[styles.section, { borderColor: colors.icon + '22' }]}>
            <ThemedText style={[styles.sectionLabel, { color: colors.icon }]}>Guest's Note</ThemedText>
            <ThemedText style={{ lineHeight: 20 }}>{req.guestNote}</ThemedText>
          </View>
        )}

        {/* Owner note / question field */}
        <View style={styles.noteField}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Note / Message to Guest</ThemedText>
          <TextInput
            style={[styles.noteInput, { color: colors.text, borderColor: colors.icon + '44' }]}
            placeholder="Optional message to the guest…"
            placeholderTextColor={colors.icon}
            value={ownerNote}
            onChangeText={setOwnerNote}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Actions — only for pending, and only for the estate owner */}
        {isPending && !isReadOnly && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#22c55e' }]}
              onPress={onApprove}
              activeOpacity={0.8}
            >
              <IconSymbol name="checkmark.circle.fill" size={18} color="#fff" />
              <ThemedText style={styles.actionText}>Approve</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
              onPress={onDecline}
              activeOpacity={0.8}
            >
              <IconSymbol name="xmark.circle.fill" size={18} color="#fff" />
              <ThemedText style={styles.actionText}>Decline</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#8b5cf6' }]}
              onPress={() => setShowAltPicker((v) => !v)}
              activeOpacity={0.8}
            >
              <IconSymbol name="arrow.triangle.2.circlepath" size={18} color="#fff" />
              <ThemedText style={styles.actionText}>Propose Dates</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#06b6d4' }]}
              onPress={() => setShowQuestion((v) => !v)}
              activeOpacity={0.8}
            >
              <IconSymbol name="questionmark.circle.fill" size={18} color="#fff" />
              <ThemedText style={styles.actionText}>Ask Question</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {showAltPicker && (
          <View style={[styles.altPicker, { borderColor: colors.icon + '33' }]}>
            <ThemedText type="defaultSemiBold" style={{ marginBottom: 8 }}>Select Alternative Dates</ThemedText>
            <DateRangePicker
              from={altFrom}
              to={altTo}
              blockedRanges={useStayStore.getState().getBlockedRanges(estateId)}
              onChange={(f, t) => { setAltFrom(f); setAltTo(t); }}
            />
            {altFrom && altTo && (
              <TouchableOpacity
                style={[styles.sendAlt, { backgroundColor: '#8b5cf6' }]}
                onPress={onProposeAlternative}
              >
                <ThemedText style={styles.actionText}>Send Proposal</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}

        {showQuestion && (
          <TouchableOpacity
            style={[styles.sendAlt, { backgroundColor: '#06b6d4' }]}
            onPress={onAskQuestion}
          >
            <ThemedText style={styles.actionText}>Send Question</ThemedText>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 24, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, gap: 16 },
  guestCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  guestInfo: { flex: 1, gap: 2 },
  guestName: { fontSize: 16 },
  guestEmail: { fontSize: 13 },
  section: { padding: 14, borderRadius: 14, borderWidth: 1, gap: 4 },
  sectionLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  datesText: { fontSize: 16 },
  nights: { fontSize: 13 },
  conflictAlert: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8, borderWidth: 1, marginTop: 6 },
  conflictText: { flex: 1, fontSize: 12, color: '#f59e0b', fontWeight: '500' },
  noteField: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  noteInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, height: 80, paddingTop: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 6 },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  altPicker: { padding: 16, borderRadius: 16, borderWidth: 1 },
  sendAlt: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  readOnlyBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  readOnlyText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
