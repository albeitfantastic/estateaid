import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateRangePicker } from '@/components/ui/date-range-picker';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, EstateColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useStayStore } from '@/store/stay-store';
import { useAvailabilityRuleStore } from '@/store/availability-rule-store';
import {
  effectiveMaxAdvanceDays,
  effectiveMinNights,
  violatesMaxAdvance,
  violatesMinNights,
} from '@/lib/availability-rule-blocking';
import { formatDateRange, nightCount } from '@/lib/date-utils';
import { guestEmailsMatch } from '@/lib/invite-email';
import { generateUuidV4 } from '@/lib/id';

export default function GuestPlanStay() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const allInvitations = useInvitationStore((s) => s.invitations);
  const { requestStay, getBlockedRanges, hasConflict } = useStayStore();
  const availabilityRules = useAvailabilityRuleStore((s) => s.rules);

  const acceptedEstateIds = useMemo(
    () =>
      allInvitations
        .filter(
          (inv) =>
            (guestEmailsMatch(inv.guestEmail, currentUser?.email) || inv.guestId === currentUser?.id) &&
            inv.status === 'accepted'
        )
        .map((inv) => inv.estateId),
    [allInvitations, currentUser?.email, currentUser?.id]
  );

  const acceptedEstates = useMemo(
    () => allEstates.filter((e) => acceptedEstateIds.includes(e.id)),
    [allEstates, acceptedEstateIds]
  );

  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(
    acceptedEstates.length === 1 ? acceptedEstates[0].id : null
  );
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo]     = useState<string | null>(null);
  const [note, setNote] = useState('');

  const blockedRanges = selectedEstateId ? getBlockedRanges(selectedEstateId) : [];
  const nights = from && to ? nightCount(from, to) : 0;
  const effMinNights =
    selectedEstateId != null ? effectiveMinNights(availabilityRules, selectedEstateId) : undefined;
  const effMaxAdvance =
    selectedEstateId != null ? effectiveMaxAdvanceDays(availabilityRules, selectedEstateId) : undefined;
  const conflictWarning =
    selectedEstateId && from && to ? hasConflict(selectedEstateId, from, to) : false;
  const minNightsBreak = Boolean(
    selectedEstateId && from && to && violatesMinNights(availabilityRules, selectedEstateId, from, to, nights)
  );
  const maxAdvanceBreak = Boolean(
    selectedEstateId && from && violatesMaxAdvance(availabilityRules, selectedEstateId, from)
  );
  const limitHint = [
    minNightsBreak && effMinNights != null ? `Minimum stay is ${effMinNights} nights.` : '',
    maxAdvanceBreak && effMaxAdvance != null
      ? `Check-in must be within ${effMaxAdvance} days from today.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  function pickEstate(id: string) {
    setSelectedEstateId(id);
    setFrom(null);
    setTo(null);
  }

  async function submit() {
    if (!selectedEstateId || !from || !to) return;
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
      Alert.alert(
        'Booking window',
        effMaxAdvance != null
          ? `Check-in must be within ${effMaxAdvance} days from today.`
          : 'Those dates are outside the allowed booking window.'
      );
      return;
    }
    const { error } = await requestStay({
      id: generateUuidV4(),
      estateId: selectedEstateId,
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
    Alert.alert('Request Sent', 'Your stay request has been sent to the owner.');
    router.back();
  }

  const canSubmit =
    !!selectedEstateId && !!from && !!to && !minNightsBreak && !maxAdvanceBreak;

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>Plan a Stay</ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Property</ThemedText>
          <View style={styles.pillRow}>
            {acceptedEstates.map((e, i) => {
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
                  onPress={() => pickEstate(e.id)}
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

        {selectedEstateId && (
          <View style={styles.section}>
            <ThemedText style={[styles.label, { color: colors.icon }]}>Dates</ThemedText>
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
              <View style={[styles.warnBanner, { backgroundColor: '#f59e0b18', borderColor: '#f59e0b55' }]}>
                <ThemedText style={[styles.warnText, { color: '#f59e0b' }]}>
                  These dates overlap another stay or a closed period. You can still send a request for the owner to review.
                </ThemedText>
              </View>
            )}
            {(minNightsBreak || maxAdvanceBreak) && limitHint.length > 0 && (
              <View style={[styles.warnBanner, { backgroundColor: '#f59e0b18', borderColor: '#f59e0b55' }]}>
                <ThemedText style={[styles.warnText, { color: '#f59e0b' }]}>{limitHint}</ThemedText>
              </View>
            )}
          </View>
        )}

        {selectedEstateId && (
          <View style={styles.section}>
            <ThemedText style={[styles.label, { color: colors.icon }]}>Message to Owner</ThemedText>
            <TextInput
              style={[styles.noteInput, { color: colors.text, borderColor: colors.icon + '44' }]}
              placeholder="Optional — reason for your stay, number of guests, etc."
              placeholderTextColor={colors.icon}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.tint }, !canSubmit && styles.disabled]}
          onPress={() => void submit()}
          disabled={!canSubmit}
          activeOpacity={0.8}
        >
          <IconSymbol name="calendar.badge.plus" size={18} color="#fff" />
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
  scroll: { paddingHorizontal: 20, gap: 24, paddingTop: 4 },
  section: { gap: 10 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontSize: 14 },
  pickerWrap: { padding: 16, borderRadius: 16, borderWidth: 1 },
  summary: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
  warnBanner: { padding: 12, borderRadius: 12, borderWidth: 1 },
  warnText: { fontSize: 13, lineHeight: 18 },
  noteInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, height: 80, paddingTop: 12 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 14, marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.45 },
});
