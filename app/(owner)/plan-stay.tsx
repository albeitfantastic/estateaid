import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
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
import { SEED_USERS } from '@/store/seed-data';
import { formatDateRange, nightCount } from '@/lib/date-utils';
import { generateId } from '@/lib/id';

export default function PlanStay() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const { createDirectStay, getBlockedRanges } = useStayStore();
  const { getInvitationsByEstate } = useInvitationStore();

  const estates = useMemo(
    () => allEstates.filter((e) => e.ownerId === currentUser?.id),
    [allEstates, currentUser?.id]
  );

  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(
    estates.length === 1 ? estates[0].id : null
  );
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);

  const blockedRanges = selectedEstateId ? getBlockedRanges(selectedEstateId) : [];

  const guests = useMemo(() => {
    if (!selectedEstateId) return [];
    const accepted = getInvitationsByEstate(selectedEstateId).filter(
      (inv) => inv.status === 'accepted' && inv.guestId
    );
    const guestIds = [...new Set(accepted.map((inv) => inv.guestId!))];
    return SEED_USERS.filter((u) => guestIds.includes(u.id));
  }, [selectedEstateId, getInvitationsByEstate]);

  // Reset guest if estate changes
  function pickEstate(id: string) {
    setSelectedEstateId(id);
    setSelectedGuestId(null);
    setFrom(null);
    setTo(null);
  }

  function submit() {
    if (!selectedEstateId) { Alert.alert('Required', 'Please select an estate.'); return; }
    if (!selectedGuestId) { Alert.alert('Required', 'Please select a guest.'); return; }
    if (!from || !to) { Alert.alert('Required', 'Please select check-in and check-out dates.'); return; }
    createDirectStay({
      id: generateId(),
      stayRequestId: '',
      estateId: selectedEstateId,
      guestId: selectedGuestId,
      from,
      to,
    });
    Alert.alert('Stay Planned', 'The stay has been added to the calendar.');
    router.back();
  }

  const canSubmit = !!selectedEstateId && !!selectedGuestId && !!from && !!to;

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
        {/* Estate picker */}
        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Property</ThemedText>
          <View style={styles.pillRow}>
            {estates.map((e, i) => {
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

        {/* Guest picker */}
        {selectedEstateId && (
          <View style={styles.section}>
            <ThemedText style={[styles.label, { color: colors.icon }]}>Guest</ThemedText>
            {guests.length === 0 ? (
              <View style={[styles.emptyGuests, { borderColor: colors.icon + '33' }]}>
                <ThemedText style={[styles.emptyGuestsText, { color: colors.icon }]}>
                  No accepted guests for this property yet.
                </ThemedText>
              </View>
            ) : (
              <View style={styles.guestList}>
                {guests.map((g) => {
                  const selected = g.id === selectedGuestId;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[
                        styles.guestRow,
                        {
                          backgroundColor: selected ? colors.tint + '12' : colors.background,
                          borderColor: selected ? colors.tint : colors.icon + '33',
                        },
                      ]}
                      onPress={() => setSelectedGuestId(g.id)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.avatar, { backgroundColor: colors.tint + '22' }]}>
                        <ThemedText style={[styles.avatarText, { color: colors.tint }]}>
                          {g.name.charAt(0).toUpperCase()}
                        </ThemedText>
                      </View>
                      <View style={styles.guestInfo}>
                        <ThemedText style={[styles.guestName, selected && { color: colors.tint }]}>
                          {g.name}
                        </ThemedText>
                        <ThemedText style={[styles.guestEmail, { color: colors.icon }]}>{g.email}</ThemedText>
                      </View>
                      {selected && <IconSymbol name="checkmark.circle.fill" size={20} color={colors.tint} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Date picker */}
        {selectedEstateId && guests.length > 0 && (
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
        )}

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.tint }, !canSubmit && styles.disabled]}
          onPress={submit}
          disabled={!canSubmit}
          activeOpacity={0.8}
        >
          <IconSymbol name="calendar.badge.plus" size={18} color="#fff" />
          <ThemedText style={styles.submitText}>Confirm Stay</ThemedText>
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
  guestList: { gap: 8 },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1.5 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  guestInfo: { flex: 1, gap: 2 },
  guestName: { fontSize: 15, fontWeight: '500' },
  guestEmail: { fontSize: 12 },
  emptyGuests: { padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  emptyGuestsText: { fontSize: 14 },
  pickerWrap: { padding: 16, borderRadius: 16, borderWidth: 1 },
  summary: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 14, marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.45 },
});
