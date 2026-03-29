import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { useStayStore } from '@/store/stay-store';
import { formatDateRange, nightCount } from '@/lib/date-utils';
import { generateId } from '@/lib/id';

export default function GuestEditStay() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const { stayRequests, updateRequest, requestStay, getBlockedRanges } = useStayStore();

  const req = useMemo(
    () => stayRequests.find((r) => r.id === requestId),
    [stayRequests, requestId]
  );

  const estate = useMemo(
    () => allEstates.find((e) => e.id === req?.estateId),
    [allEstates, req?.estateId]
  );

  const estateIndex = useMemo(
    () => allEstates.findIndex((e) => e.id === req?.estateId),
    [allEstates, req?.estateId]
  );
  const dotColor = EstateColors[estateIndex >= 0 ? estateIndex % EstateColors.length : 0];

  const blockedRanges = useMemo(
    () => (req ? getBlockedRanges(req.estateId) : []),
    [req, getBlockedRanges]
  );

  const [from, setFrom] = useState<string | null>(req?.requestedFrom ?? null);
  const [to, setTo] = useState<string | null>(req?.requestedTo ?? null);

  if (!req) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <IconSymbol name="arrow.left" size={22} color={colors.tint} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>Edit Stay</ThemedText>
        </View>
        <View style={styles.center}>
          <ThemedText style={{ opacity: 0.5 }}>Request not found.</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const isPending = req.status === 'pending';
  const canSubmit = !!from && !!to;

  function submit() {
    if (!from || !to || !currentUser) return;

    if (isPending) {
      updateRequest(req.id, from, to);
      Alert.alert('Request Updated', 'Your stay request has been updated and is pending approval.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      // Approved — create a new pending request; existing stay stays active
      requestStay({
        id: generateId(),
        estateId: req.estateId,
        guestId: currentUser.id,
        requestedFrom: from,
        requestedTo: to,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      Alert.alert(
        'Request Sent',
        'A new request has been sent to the owner. Your current confirmed stay remains active until the new request is approved.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>Edit Stay</ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Property</ThemedText>
          <View
            style={[
              styles.estatePill,
              { backgroundColor: dotColor + '22', borderColor: dotColor },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <ThemedText style={[styles.pillText, { color: dotColor, fontWeight: '600' }]}>
              {estate?.name ?? req.estateId}
            </ThemedText>
          </View>
        </View>

        {!isPending && (
          <View style={[styles.notice, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '33' }]}>
            <IconSymbol name="info.circle.fill" size={16} color={colors.tint} />
            <ThemedText style={[styles.noticeText, { color: colors.tint }]}>
              Changing dates on an approved stay creates a new request. Your confirmed stay stays active until approved.
            </ThemedText>
          </View>
        )}

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
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.tint }, !canSubmit && styles.disabled]}
          onPress={submit}
          disabled={!canSubmit}
          activeOpacity={0.8}
        >
          <IconSymbol name="checkmark" size={18} color="#fff" />
          <ThemedText style={styles.submitText}>
            {isPending ? 'Update Request' : 'Send New Request'}
          </ThemedText>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, gap: 24, paddingTop: 4 },
  section: { gap: 10 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  estatePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, alignSelf: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontSize: 14 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18 },
  pickerWrap: { padding: 16, borderRadius: 16, borderWidth: 1 },
  summary: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 14, marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.45 },
});
