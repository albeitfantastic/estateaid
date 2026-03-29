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
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import { useStayStore } from '@/store/stay-store';
import { formatDateRange, nightCount } from '@/lib/date-utils';
import { generateUuidV4 } from '@/lib/id';

export default function PlanStay() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const profileById = useProfileStore((s) => s.byId);
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
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);

  const blockedRanges = selectedEstateId ? getBlockedRanges(selectedEstateId) : [];

  // Build guest options: owner first, then accepted guests of the selected estate
  const guestOptions = useMemo(() => {
    const ownerEntry = currentUser
      ? [{ id: currentUser.id, name: `${currentUser.name} (you)`, email: currentUser.email }]
      : [];
    if (!selectedEstateId) return ownerEntry;
    const accepted = getInvitationsByEstate(selectedEstateId).filter(
      (inv) => inv.status === 'accepted' && inv.guestId
    );
    const guestIds = [...new Set(accepted.map((inv) => inv.guestId!))];
    const guests = guestIds.map((id) => {
      const inv = accepted.find((i) => i.guestId === id);
      return {
        id,
        name: resolveUserDisplayName(id, profileById, inv?.guestEmail),
        email: inv?.guestEmail ?? '',
      };
    });
    return [...ownerEntry, ...guests];
  }, [selectedEstateId, currentUser, getInvitationsByEstate, profileById]);

  function pickEstate(id: string) {
    setSelectedEstateId(id);
    setSelectedGuestIds([]);
    setFrom(null);
    setTo(null);
  }

  function toggleGuest(id: string) {
    setSelectedGuestIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  async function submit() {
    if (!selectedEstateId) { Alert.alert('Required', 'Please select a property.'); return; }
    if (selectedGuestIds.length === 0) { Alert.alert('Required', 'Please select at least one guest.'); return; }
    if (!from || !to) { Alert.alert('Required', 'Please select check-in and check-out dates.'); return; }

    for (const guestId of selectedGuestIds) {
      const { error } = await createDirectStay({
        id: generateUuidV4(),
        stayRequestId: '',
        estateId: selectedEstateId,
        guestId,
        from,
        to,
      });
      if (error) {
        Alert.alert('Could not save stay', error);
        return;
      }
    }

    const count = selectedGuestIds.length;
    Alert.alert('Stay Planned', `${count} stay${count > 1 ? 's' : ''} added to the calendar.`);
    router.back();
  }

  const canSubmit = !!selectedEstateId && selectedGuestIds.length > 0 && !!from && !!to;

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

        {/* Guest multi-select */}
        {selectedEstateId && (
          <View style={styles.section}>
            <ThemedText style={[styles.label, { color: colors.icon }]}>
              Guests{selectedGuestIds.length > 0 ? ` · ${selectedGuestIds.length} selected` : ''}
            </ThemedText>
            <View style={styles.guestList}>
              {guestOptions.map((g) => {
                const selected = selectedGuestIds.includes(g.id);
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
                    onPress={() => toggleGuest(g.id)}
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
                    <View style={[
                      styles.checkbox,
                      {
                        backgroundColor: selected ? colors.tint : 'transparent',
                        borderColor: selected ? colors.tint : colors.icon + '55',
                      },
                    ]}>
                      {selected && <IconSymbol name="checkmark" size={12} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Date picker */}
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
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.tint }, !canSubmit && styles.disabled]}
          onPress={() => void submit()}
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
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  pickerWrap: { padding: 16, borderRadius: 16, borderWidth: 1 },
  summary: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 14, marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.45 },
});
