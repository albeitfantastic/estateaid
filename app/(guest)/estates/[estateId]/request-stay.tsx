import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { DateRangePicker } from '@/components/ui/date-range-picker';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useStayStore } from '@/store/stay-store';
import { useAvailabilityRuleStore } from '@/store/availability-rule-store';
import {
  effectiveMaxAdvanceDays,
  effectiveMinNights,
  violatesMaxAdvance,
  violatesMinNights,
} from '@/lib/availability-rule-blocking';
import { formatDateRange, nightCount } from '@/lib/date-utils';
import { generateUuidV4 } from '@/lib/id';
import { getPushToken, sendPush } from '@/lib/notifications';

export default function RequestStay() {
  const { t } = useTranslation();
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const estate = useEstateStore((s) => s.estates.find((e) => e.id === estateId));
  const { requestStay, getBlockedRanges, hasConflict } = useStayStore();
  const availabilityRules = useAvailabilityRuleStore((s) => s.rules);

  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const blockedRanges = getBlockedRanges(estateId);
  const conflictWarning = from && to ? hasConflict(estateId, from, to) : false;
  const nights = from && to ? nightCount(from, to) : 0;
  const effMinNights = effectiveMinNights(availabilityRules, estateId);
  const effMaxAdvance = effectiveMaxAdvanceDays(availabilityRules, estateId);
  const minNightsBreak = Boolean(
    from && to && violatesMinNights(availabilityRules, estateId, from, to, nights)
  );
  const maxAdvanceBreak = Boolean(from && violatesMaxAdvance(availabilityRules, estateId, from));
  const limitHint = [
    minNightsBreak && effMinNights != null ? `Minimum stay is ${effMinNights} nights.` : '',
    maxAdvanceBreak && effMaxAdvance != null
      ? `Check-in must be within ${effMaxAdvance} days from today.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  async function submit() {
    if (!from || !to) { Alert.alert('Required', 'Please select check-in and check-out dates.'); return; }
    if (minNightsBreak) {
      Alert.alert(
        'Minimum stay',
        effMinNights != null
          ? `This property requires at least ${effMinNights} nights.`
          : 'Dates do not meet the minimum stay.'
      );
      return;
    }
    if (maxAdvanceBreak) {
      const d = effMaxAdvance;
      Alert.alert(
        'Booking window',
        d != null
          ? `Check-in must be within ${d} days from today.`
          : 'Those dates are outside the allowed booking window.'
      );
      return;
    }
    const { error } = await requestStay({
      id: generateUuidV4(),
      estateId,
      guestId: currentUser!.id,
      requestedFrom: from,
      requestedTo: to,
      status: 'pending',
      guestNote: note.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (error) {
      Alert.alert('Could not send request', error);
      return;
    }
    // Notify the estate owner — fire-and-forget
    if (estate?.ownerId) {
      void getPushToken(estate.ownerId).then((token) =>
        sendPush(
          token,
          'New Stay Request',
          `${currentUser!.name} requested a stay at ${estate.name}.`,
          { estateId }
        )
      );
    }
    Alert.alert('Request Sent', 'Your stay request has been sent to the owner.');
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>{t('titles.planStay')}</ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.pickerWrap, { borderColor: colors.icon + '33', backgroundColor: colors.background }]}>
          <DateRangePicker
            from={from}
            to={to}
            blockedRanges={blockedRanges}
            onChange={(f, t) => { setFrom(f); setTo(t); }}
          />
        </View>

        {from && to && (
          <View style={[styles.summary, { backgroundColor: colors.tint + '11', borderColor: colors.tint + '33' }]}>
            <ThemedText type="defaultSemiBold">{formatDateRange(from, to)}</ThemedText>
            <ThemedText style={{ color: colors.icon }}>{nightCount(from, to)} nights</ThemedText>
          </View>
        )}

        {conflictWarning && (
          <View style={[styles.warning, { backgroundColor: '#f59e0b18', borderColor: '#f59e0b55' }]}>
            <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#f59e0b" />
            <ThemedText style={[styles.warningText, { color: '#f59e0b' }]}>
              These dates overlap another stay or a period that is not open for booking. You can still send a request for the owner to review.
            </ThemedText>
          </View>
        )}

        {(minNightsBreak || maxAdvanceBreak) && limitHint.length > 0 && (
          <View style={[styles.warning, { backgroundColor: '#f59e0b18', borderColor: '#f59e0b55' }]}>
            <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#f59e0b" />
            <ThemedText style={[styles.warningText, { color: '#f59e0b' }]}>{limitHint}</ThemedText>
          </View>
        )}

        <View style={styles.noteField}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Message to Owner</ThemedText>
          <TextInput
            style={[styles.noteInput, { color: colors.text, borderColor: colors.icon + '44' }]}
            placeholder="Optional note — reason for your stay, number of guests, etc."
            placeholderTextColor={colors.icon}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: colors.tint },
            (!from || !to || minNightsBreak || maxAdvanceBreak) && styles.disabled,
          ]}
          onPress={() => void submit()}
          disabled={!from || !to || minNightsBreak || maxAdvanceBreak}
          activeOpacity={0.8}
        >
          <ThemedText style={styles.submitText}>Send Request</ThemedText>
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
  scroll: { paddingHorizontal: 20, gap: 16 },
  pickerWrap: { padding: 16, borderRadius: 16, borderWidth: 1 },
  summary: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
  warning: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 12, borderWidth: 1, gap: 8 },
  warningText: { flex: 1, fontSize: 13, lineHeight: 18 },
  noteField: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  noteInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, height: 80, paddingTop: 12 },
  submitBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.45 },
});
