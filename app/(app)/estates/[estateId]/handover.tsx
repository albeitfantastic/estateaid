import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { addDays, today } from '@/lib/date-utils';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useHandoverStore } from '@/store/handover-store';
import { useStayStore } from '@/store/stay-store';
import { useActivityLogStore } from '@/store/activity-log-store';

export default function HandoverScreen() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const estate = useEstateStore((s) => s.estates.find((e) => e.id === estateId));
  const isOwner = !!estate && estate.ownerId === currentUser?.id;
  const items = useHandoverStore((s) => s.getTemplateItems(estateId));
  const setTemplateItems = useHandoverStore((s) => s.setTemplateItems);
  const toggleItem = useHandoverStore((s) => s.toggleItem);
  const getCompletion = useHandoverStore((s) => s.getCompletion);
  const stays = useStayStore((s) => s.stays);
  const todayStr = today();

  const activeGuestStay = useMemo(() => {
    if (!currentUser || isOwner) return null;
    return (
      stays.find(
        (s) =>
          s.estateId === estateId &&
          s.guestId === currentUser.id &&
          todayStr >= s.to &&
          todayStr <= addDays(s.to, 1)
      ) ?? null
    );
  }, [stays, estateId, currentUser, isOwner, todayStr]);

  const completion = activeGuestStay ? getCompletion(activeGuestStay.id) : undefined;
  const [draft, setDraft] = useState(items.join('\n'));

  function saveTemplate() {
    const next = draft
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    setTemplateItems(estateId, next.length ? next : items);
  }

  function onToggle(item: string) {
    if (!activeGuestStay || !currentUser) return;
    toggleItem({
      estateId,
      stayId: activeGuestStay.id,
      guestId: currentUser.id,
      item,
    });
    useActivityLogStore.getState().logActivity(estateId, currentUser.id, 'estate_updated', {
      handoverItem: item,
    });
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>
          Handover
        </ThemedText>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
        {isOwner ? (
          <>
            <ThemedText style={[styles.hint, { color: colors.icon }]}>
              Guests see this checklist on the last day of their stay and the day after. One item per
              line.
            </ThemedText>
            <TextInput
              style={[styles.area, { borderColor: colors.border, color: colors.text }]}
              multiline
              value={draft}
              onChangeText={setDraft}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.save, { backgroundColor: colors.tint }]}
              onPress={saveTemplate}
              activeOpacity={0.85}
            >
              <ThemedText style={styles.saveText}>Save checklist</ThemedText>
            </TouchableOpacity>
          </>
        ) : activeGuestStay ? (
          <>
            <ThemedText style={[styles.hint, { color: colors.icon }]}>
              Before you leave — tick each item when done.
            </ThemedText>
            {items.map((item) => {
              const checked = !!completion?.checked[item];
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.row, { borderColor: colors.border }]}
                  onPress={() => onToggle(item)}
                  activeOpacity={0.75}
                >
                  <IconSymbol
                    name={checked ? 'checkmark.circle.fill' : 'circle'}
                    size={22}
                    color={checked ? colors.tint : colors.icon}
                  />
                  <ThemedText style={{ flex: 1 }}>{item}</ThemedText>
                </TouchableOpacity>
              );
            })}
          </>
        ) : (
          <ThemedText style={{ color: colors.icon }}>
            Handover appears on the last day of your stay and the day after.
          </ThemedText>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  back: { padding: 8, marginRight: 4 },
  title: { flex: 1, fontSize: 24, fontWeight: '700' },
  hint: { fontSize: 13, marginBottom: 12 },
  area: {
    minHeight: 180,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  save: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
});
