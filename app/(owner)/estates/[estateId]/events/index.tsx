import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/section-header';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEventStore } from '@/store/event-store';
import { describeRecurrence } from '@/lib/event-utils';

function paramId(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return '';
}

export default function EventsIndex() {
  const params = useLocalSearchParams<{ estateId: string | string[] }>();
  const estateId = paramId(params.estateId);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { events, deleteEvent } = useEventStore();

  const estateEvents = useMemo(
    () => events.filter((e) => e.estateId === estateId),
    [events, estateId]
  );
  const recurring = estateEvents.filter((e) => e.type === 'recurring');
  const tasks = estateEvents.filter((e) => e.type === 'task');

  function confirmDelete(id: string, title: string) {
    Alert.alert('Delete Event', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteEvent(id) },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>Events</ThemedText>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.tint }]}
          onPress={() => router.push(`/(owner)/estates/${estateId}/events/new` as never)}
          activeOpacity={0.8}
        >
          <IconSymbol name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {estateEvents.length === 0 ? (
        <EmptyState
          icon="calendar.badge.plus"
          title="No events yet"
          subtitle="Add recurring events or one-time tasks for this estate."
          actionLabel="Add Event"
          onAction={() => router.push(`/(owner)/estates/${estateId}/events/new` as never)}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}>
          {recurring.length > 0 && (
            <>
              <SectionHeader title={`Recurring · ${recurring.length}`} />
              {recurring.map((ev) => (
                <TouchableOpacity
                  key={ev.id}
                  style={[styles.row, { borderColor: colors.icon + '22', backgroundColor: colors.surface }]}
                  onPress={() => router.push(`/(owner)/estates/${estateId}/events/${ev.id}` as never)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.colorBar, { backgroundColor: ev.color ?? colors.tint }]} />
                  <View style={styles.rowInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.rowTitle}>{ev.title}</ThemedText>
                    <ThemedText style={[styles.rowSub, { color: colors.icon }]}>
                      {describeRecurrence(ev)}
                    </ThemedText>
                    {ev.description ? (
                      <ThemedText style={[styles.rowDesc, { color: colors.icon }]} numberOfLines={1}>
                        {ev.description}
                      </ThemedText>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => confirmDelete(ev.id, ev.title)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <IconSymbol name="trash" size={16} color={colors.error} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </>
          )}

          {tasks.length > 0 && (
            <>
              <SectionHeader title={`Tasks · ${tasks.length}`} />
              {tasks.map((ev) => (
                <TouchableOpacity
                  key={ev.id}
                  style={[styles.row, { borderColor: colors.icon + '22', backgroundColor: colors.surface }]}
                  onPress={() => router.push(`/(owner)/estates/${estateId}/events/${ev.id}` as never)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.colorBar, { backgroundColor: ev.color ?? colors.tint }]} />
                  <View style={styles.rowInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.rowTitle}>{ev.title}</ThemedText>
                    <ThemedText style={[styles.rowSub, { color: colors.icon }]}>
                      {ev.date ?? 'No date'}
                    </ThemedText>
                    {ev.description ? (
                      <ThemedText style={[styles.rowDesc, { color: colors.icon }]} numberOfLines={1}>
                        {ev.description}
                      </ThemedText>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => confirmDelete(ev.id, ev.title)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <IconSymbol name="trash" size={16} color={colors.error} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 28, fontWeight: '700' },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 10,
    gap: 12,
    paddingRight: 14,
  },
  colorBar: { width: 4, alignSelf: 'stretch' },
  rowInfo: { flex: 1, paddingVertical: 12, gap: 2 },
  rowTitle: { fontSize: 14 },
  rowSub: { fontSize: 12 },
  rowDesc: { fontSize: 11, marginTop: 2 },
});
