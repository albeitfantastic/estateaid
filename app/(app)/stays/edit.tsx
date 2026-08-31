import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { DateRangePicker } from '@/components/ui/date-range-picker';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import {
  FilledButton,
  ScreenScroll,
  ScreenShell,
  SectionLabel,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { EstateColors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useStayStore } from '@/store/stay-store';
import { formatDateRange, nightCount } from '@/lib/date-utils';
import { generateUuidV4 } from '@/lib/id';

export default function GuestEditStay() {
  const { t } = useTranslation();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const { stayRequests, stays, updateRequest, requestStay, cancelRequest } = useStayStore();

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

  const blockedRanges = useMemo(() => {
    if (!req) return [];
    const isPendingReq = req.status === 'pending';
    return stays
      .filter(
        (s) =>
          s.estateId === req.estateId &&
          (isPendingReq || s.stayRequestId !== req.id)
      )
      .map(({ from, to }) => ({ from, to }));
  }, [req, stays]);

  const [from, setFrom] = useState<string | null>(req?.requestedFrom ?? null);
  const [to, setTo] = useState<string | null>(req?.requestedTo ?? null);

  if (!req) {
    return (
      <ScreenShell title={t('titles.editStay')}>
        <View style={styles.center}>
          <ThemedText style={{ opacity: 0.5 }}>Request not found.</ThemedText>
        </View>
      </ScreenShell>
    );
  }

  const stayRequest = req;
  const isPending = stayRequest.status === 'pending';
  const canSubmit = !!from && !!to;

  async function submit() {
    if (!from || !to || !currentUser) return;

    if (isPending) {
      updateRequest(stayRequest.id, from, to);
      Alert.alert('Request Updated', 'Your stay request has been updated and is pending approval.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      const { error } = await requestStay({
        id: generateUuidV4(),
        estateId: stayRequest.estateId,
        guestId: currentUser.id,
        requestedFrom: from,
        requestedTo: to,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      if (error) {
        Alert.alert('Could not send request', error);
        return;
      }
      Alert.alert(
        'Request Sent',
        'A new request has been sent to the host. Your current confirmed stay remains active until the new request is approved.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }

  return (
    <ScreenShell title={t('titles.editStay')}>
      <ScreenScroll gap={24} contentContainerStyle={styles.scroll}>
        <View style={styles.section}>
          <SectionLabel>Property</SectionLabel>
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
          <SectionLabel>Dates</SectionLabel>
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

        <FilledButton
          label={isPending ? 'Update Request' : 'Send New Request'}
          icon="checkmark"
          onPress={() => void submit()}
          disabled={!canSubmit}
        />

        {isPending && (
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.error }]}
            onPress={() =>
              Alert.alert('Cancel Request', 'Are you sure you want to cancel this stay request?', [
                { text: 'Keep', style: 'cancel' },
                {
                  text: 'Cancel Request',
                  style: 'destructive',
                  onPress: () => { cancelRequest(req.id); router.back(); },
                },
              ])
            }
            activeOpacity={0.7}
          >
            <ThemedText style={[styles.cancelText, { color: colors.error }]}>Cancel Request</ThemedText>
          </TouchableOpacity>
        )}
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingTop: 4 },
  section: { gap: 10 },
  estatePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, alignSelf: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontSize: 14 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18 },
  pickerWrap: { padding: 16, borderRadius: 16, borderWidth: 1 },
  summary: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
  cancelBtn: { alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, marginTop: 4 },
  cancelText: { fontSize: 15, fontWeight: '600' },
});
