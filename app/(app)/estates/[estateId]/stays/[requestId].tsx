import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DateRangePicker } from '@/components/ui/date-range-picker';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StatusBadge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import {
  ScreenScroll,
  ScreenShell,
  SectionLabel,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { StatusColors } from '@/constants/theme';
import { ThemedView } from '@/components/themed-view';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { useStayStore } from '@/store/stay-store';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { sendCategorizedPush } from '@/lib/notifications';
import { formatDateRange, nightCount } from '@/lib/date-utils';
import { useCan } from '@/lib/entitlements/capabilities';
import { openHostCapabilityDenied } from '@/lib/entitlements/host-gate';
import { useMarkInboxSeenOnFocus } from '@/store/inbox-seen-store';

export default function ReviewStayRequest() {
  const { t } = useTranslation();
  const { estateId, requestId } = useLocalSearchParams<{ estateId: string; requestId: string }>();
  const router = useRouter();
  useMarkInboxSeenOnFocus('request', requestId);
  const { colors } = useScreenTheme();
  const { stayRequests, approveStay, declineStay, proposeAlternative, askQuestion, hasConflict } = useStayStore();
  const profileById = useProfileStore((s) => s.byId);
  const currentUser = useAuthStore((s) => s.currentUser);
  const estate = useEstateStore((s) => s.estates.find((e) => e.id === estateId));
  const can = useCan();
  const canApprove = can('stays.approve', { estateId });
  const isReadOnly = !canApprove;
  const estateName = estate?.name ?? t('stayReview.theEstate');
  const ownerName = currentUser?.name ?? t('stayReview.theHost');

  const req = stayRequests.find((r) => r.id === requestId);
  const guestName = req ? resolveUserDisplayName(req.guestId, profileById) : '';

  const [ownerNote, setOwnerNote] = useState(req?.ownerNote ?? '');
  const [altFrom, setAltFrom] = useState<string | null>(req?.alternativeFrom ?? null);
  const [altTo, setAltTo] = useState<string | null>(req?.alternativeTo ?? null);
  const [showAltPicker, setShowAltPicker] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);

  if (!req) {
    return (
      <ThemedView style={styles.center}><ThemedText>{t('stayReview.notFound')}</ThemedText></ThemedView>
    );
  }

  const conflict = hasConflict(estateId, req.requestedFrom, req.requestedTo, requestId);
  const isPending = req.status === 'pending';

  function notifyGuest(title: string, body: string) {
    if (!req) return;
    void sendCategorizedPush('stay_decisions', req.guestId, title, body, {
      type: 'stay_decision',
      estateId,
      requestId,
    });
  }

  function onApprove() {
    if (!canApprove) {
      openHostCapabilityDenied(estateId, 'stays.approve', `/(app)/estates/${estateId}/stays/${requestId}`);
      return;
    }
    const result = approveStay(requestId, ownerNote || undefined);
    if (!result.success) {
      Alert.alert(t('stayReview.cannotApproveTitle'), t('stayReview.cannotApproveBody'));
    } else {
      notifyGuest(t('stayReview.approvedTitle'), t('stayReview.approvedBody', { estate: estateName }));
      router.back();
    }
  }

  function onDecline() {
    if (!canApprove) {
      openHostCapabilityDenied(estateId, 'stays.approve', `/(app)/estates/${estateId}/stays/${requestId}`);
      return;
    }
    Alert.alert(t('stayReview.declineTitle'), t('stayReview.declineBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('stayReview.decline'), style: 'destructive', onPress: () => {
          declineStay(requestId, ownerNote || undefined);
          notifyGuest(t('stayReview.declinedTitle'), t('stayReview.declinedBody', { estate: estateName }));
          router.back();
        },
      },
    ]);
  }

  function onProposeAlternative() {
    if (!altFrom || !altTo) { Alert.alert(t('common.required'), t('stayReview.requiredDates')); return; }
    proposeAlternative(requestId, altFrom, altTo, ownerNote || undefined);
    notifyGuest(t('stayReview.altProposedTitle'), t('stayReview.altProposedBody', { host: ownerName, estate: estateName }));
    router.back();
  }

  function onAskQuestion() {
    if (!ownerNote.trim()) { Alert.alert(t('common.required'), t('stayReview.requiredQuestion')); return; }
    askQuestion(requestId, ownerNote.trim());
    notifyGuest(t('stayReview.questionTitle'), t('stayReview.questionBody', { host: ownerName, estate: estateName }));
    router.back();
  }

  return (
    <ScreenShell title={t('titles.stayRequest')}>
      <ScreenScroll contentContainerStyle={styles.scroll} gap={16} keyboardShouldPersistTaps="handled">
        {isReadOnly && (
          <View style={[styles.readOnlyBanner, { backgroundColor: colors.icon + '12', borderColor: colors.icon + '30' }]}>
            <IconSymbol name="info.circle.fill" size={15} color={colors.icon} />
            <ThemedText style={[styles.readOnlyText, { color: colors.icon }]}>
              {t('stayReview.readOnly')}
            </ThemedText>
          </View>
        )}
        <View style={[styles.guestCard, { borderColor: colors.icon + '22', backgroundColor: colors.background }]}>
          <Avatar name={guestName} size={48} color={colors.tint} />
          <View style={styles.guestInfo}>
            <ThemedText type="defaultSemiBold" style={styles.guestName}>{guestName}</ThemedText>
          </View>
          <StatusBadge status={req.status} />
        </View>

        <View style={[styles.section, { borderColor: colors.icon + '22' }]}>
          <SectionLabel>{t('stayReview.requestedDates')}</SectionLabel>
          <ThemedText type="defaultSemiBold" style={styles.datesText}>
            {formatDateRange(req.requestedFrom, req.requestedTo)}
          </ThemedText>
          <ThemedText style={[styles.nights, { color: colors.icon }]}>
            {t('common.nights', { count: nightCount(req.requestedFrom, req.requestedTo) })}
          </ThemedText>
          {conflict && (
            <View style={[styles.conflictAlert, { backgroundColor: colors.warning + '18', borderColor: colors.warning + '55' }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={14} color={colors.warning} />
              <ThemedText style={[styles.conflictText, { color: colors.warning }]}>
                {t('stayReview.conflict')}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={[styles.section, { borderColor: colors.icon + '22' }]}>
          <SectionLabel>{t('stayReview.guestCount')}</SectionLabel>
          <ThemedText type="defaultSemiBold">
            {t('stayReview.guestCountValue', { count: req.guestCount ?? 1 })}
          </ThemedText>
        </View>

        {req.guestNote && (
          <View style={[styles.section, { borderColor: colors.icon + '22' }]}>
            <SectionLabel>{t('stayReview.guestNote')}</SectionLabel>
            <ThemedText style={{ lineHeight: 20 }}>{req.guestNote}</ThemedText>
          </View>
        )}

        <View style={styles.noteField}>
          <SectionLabel>{t('stayReview.noteLabel')}</SectionLabel>
          <TextInput
            style={[styles.noteInput, { color: colors.text, borderColor: colors.icon + '44' }]}
            placeholder={t('stayReview.notePlaceholder')}
            placeholderTextColor={colors.icon}
            value={ownerNote}
            onChangeText={setOwnerNote}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {isPending && !isReadOnly && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.success }]}
              onPress={onApprove}
              activeOpacity={0.8}
            >
              <IconSymbol name="checkmark.circle.fill" size={18} color={colors.textOnBrand} />
              <ThemedText style={[styles.actionText, { color: colors.textOnBrand }]}>{t('stayReview.approve')}</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.error }]}
              onPress={onDecline}
              activeOpacity={0.8}
            >
              <IconSymbol name="xmark.circle.fill" size={18} color={colors.textOnBrand} />
              <ThemedText style={[styles.actionText, { color: colors.textOnBrand }]}>{t('stayReview.decline')}</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: StatusColors.alternative_proposed }]}
              onPress={() => setShowAltPicker((v) => !v)}
              activeOpacity={0.8}
            >
              <IconSymbol name="arrow.triangle.2.circlepath" size={18} color={colors.textOnBrand} />
              <ThemedText style={[styles.actionText, { color: colors.textOnBrand }]}>{t('stayReview.proposeDates')}</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: StatusColors.question_asked }]}
              onPress={() => setShowQuestion((v) => !v)}
              activeOpacity={0.8}
            >
              <IconSymbol name="questionmark.circle.fill" size={18} color={colors.textOnBrand} />
              <ThemedText style={[styles.actionText, { color: colors.textOnBrand }]}>{t('stayReview.askQuestion')}</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {showAltPicker && (
          <View style={[styles.altPicker, { borderColor: colors.icon + '33' }]}>
            <ThemedText type="defaultSemiBold" style={{ marginBottom: 8 }}>{t('stayReview.selectAltDates')}</ThemedText>
            <DateRangePicker
              from={altFrom}
              to={altTo}
              blockedRanges={useStayStore.getState().getBlockedRanges(estateId)}
              onChange={(f, toVal) => { setAltFrom(f); setAltTo(toVal); }}
            />
            {altFrom && altTo && (
              <TouchableOpacity
                style={[styles.sendAlt, { backgroundColor: '#8b5cf6' }]}
                onPress={onProposeAlternative}
              >
                <ThemedText style={styles.actionText}>{t('stayReview.sendProposal')}</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}

        {showQuestion && (
          <TouchableOpacity
            style={[styles.sendAlt, { backgroundColor: '#06b6d4' }]}
            onPress={onAskQuestion}
          >
            <ThemedText style={styles.actionText}>{t('stayReview.sendQuestion')}</ThemedText>
          </TouchableOpacity>
        )}
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 16 },
  guestCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  guestInfo: { flex: 1, gap: 2 },
  guestName: { fontSize: 16 },
  section: { padding: 14, borderRadius: 14, borderWidth: 1, gap: 4 },
  datesText: { fontSize: 16 },
  nights: { fontSize: 13 },
  conflictAlert: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8, borderWidth: 1, marginTop: 6 },
  conflictText: { flex: 1, fontSize: 12, fontWeight: '500' },
  noteField: { gap: 6 },
  noteInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, height: 80, paddingTop: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 6 },
  actionText: { fontWeight: '600', fontSize: 13 },
  altPicker: { padding: 16, borderRadius: 16, borderWidth: 1 },
  sendAlt: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  readOnlyBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  readOnlyText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
