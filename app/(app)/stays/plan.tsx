import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { DateRangePicker } from '@/components/ui/date-range-picker';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, EstateColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { acceptedInvitedEstateIds } from '@/lib/accepted-invited-estates';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useStayStore } from '@/store/stay-store';
import { useAvailabilityRuleStore } from '@/store/availability-rule-store';
import {
  effectiveMaxAdvanceDays,
  violatesMaxAdvance,
} from '@/lib/availability-rule-blocking';
import { formatDateRange, nightCount } from '@/lib/date-utils';
import { generateUuidV4 } from '@/lib/id';

function paramString(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return '';
}

export default function GuestPlanStay() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ estateId?: string | string[] }>();
  const paramEstateId = paramString(params.estateId);
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const allInvitations = useInvitationStore((s) => s.invitations);
  const { requestStay, getBlockedRanges, hasConflict } = useStayStore();
  const availabilityRules = useAvailabilityRuleStore((s) => s.rules);

  const acceptedEstateIds = useMemo(
    () => acceptedInvitedEstateIds(allInvitations, currentUser?.id, currentUser?.email),
    [allInvitations, currentUser?.email, currentUser?.id]
  );

  const acceptedEstates = useMemo(
    () => allEstates.filter((e) => acceptedEstateIds.includes(e.id)),
    [allEstates, acceptedEstateIds]
  );

  const paramLocked =
    !!paramEstateId && acceptedEstateIds.includes(paramEstateId);

  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(() => {
    if (paramEstateId && acceptedEstateIds.includes(paramEstateId)) return paramEstateId;
    return acceptedEstates.length === 1 ? acceptedEstates[0].id : null;
  });
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (paramLocked) {
      setSelectedEstateId(paramEstateId);
      return;
    }
    if (selectedEstateId && !acceptedEstateIds.includes(selectedEstateId)) {
      setSelectedEstateId(acceptedEstates.length === 1 ? acceptedEstates[0].id : null);
    } else if (!selectedEstateId && acceptedEstates.length === 1) {
      setSelectedEstateId(acceptedEstates[0].id);
    }
  }, [paramLocked, paramEstateId, acceptedEstateIds, acceptedEstates, selectedEstateId]);

  const blockedRanges = selectedEstateId ? getBlockedRanges(selectedEstateId) : [];
  const effMaxAdvance =
    selectedEstateId != null ? effectiveMaxAdvanceDays(availabilityRules, selectedEstateId) : undefined;
  const conflictWarning =
    selectedEstateId && from && to ? hasConflict(selectedEstateId, from, to) : false;
  const maxAdvanceBreak = Boolean(
    selectedEstateId && from && violatesMaxAdvance(availabilityRules, selectedEstateId, from)
  );
  const limitHint =
    maxAdvanceBreak && effMaxAdvance != null
      ? `Check-in must be within ${effMaxAdvance} days from today.`
      : '';

  function pickEstate(id: string) {
    setSelectedEstateId(id);
    setFrom(null);
    setTo(null);
  }

  async function submit() {
    if (!selectedEstateId || !from || !to) return;
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
    Alert.alert('Request Sent', 'Your stay request has been sent to the host.');
    router.back();
  }

  const canSubmit =
    !!selectedEstateId && !!from && !!to && !maxAdvanceBreak;

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>{t('titles.requestDates')}</ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Property</ThemedText>
          <View style={styles.pillRow}>
            {(paramLocked
              ? acceptedEstates.filter((e) => e.id === paramEstateId)
              : acceptedEstates
            ).map((e, i) => {
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
                  onPress={() => {
                    if (paramLocked) return;
                    pickEstate(e.id);
                  }}
                  activeOpacity={paramLocked ? 1 : 0.75}
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
                  These dates overlap another stay or a closed period. You can still send a request for the host to review.
                </ThemedText>
              </View>
            )}
            {maxAdvanceBreak && limitHint.length > 0 && (
              <View style={[styles.warnBanner, { backgroundColor: '#f59e0b18', borderColor: '#f59e0b55' }]}>
                <ThemedText style={[styles.warnText, { color: '#f59e0b' }]}>{limitHint}</ThemedText>
              </View>
            )}
          </View>
        )}

        {selectedEstateId && (
          <View style={styles.section}>
            <ThemedText style={[styles.label, { color: colors.icon }]}>Message to Host</ThemedText>
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
