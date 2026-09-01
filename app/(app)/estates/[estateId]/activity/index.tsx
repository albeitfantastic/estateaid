import { Alert, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  FilledButton,
  GroupedList,
  GroupedRow,
  ScreenScroll,
  ScreenShell,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { useCan } from '@/lib/entitlements/capabilities';
import { googleMapsSearchUrl } from '@/lib/maps-url';
import { normalizeWebsiteUrl } from '@/lib/website-url';
import { useContactStore } from '@/store/contact-store';
import { useStayActivityStore } from '@/store/stay-activity-store';

function paramId(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return '';
}

export default function ActivitiesScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ estateId: string | string[] }>();
  const estateId = paramId(params.estateId);
  const router = useRouter();
  const { colors } = useScreenTheme();
  const canWrite = useCan()('activities.write', { estateId });
  const { getActivitiesByEstate, deleteActivity, fetchFromSupabase } = useStayActivityStore();
  const allContacts = useContactStore((s) => s.contacts);
  const contacts = useMemo(
    () => (Array.isArray(allContacts) ? allContacts : []).filter((c) => c.estateId === estateId),
    [allContacts, estateId]
  );
  const activities = getActivitiesByEstate(estateId);

  useFocusEffect(
    useCallback(() => {
      void fetchFromSupabase();
    }, [fetchFromSupabase])
  );

  function contactName(id?: string) {
    if (!id) return undefined;
    return contacts.find((c) => c.id === id)?.name;
  }

  function goNew() {
    router.push(`/(app)/estates/${estateId}/activity/new` as never);
  }

  function confirmDelete(id: string, name: string) {
    Alert.alert(t('activitiesList.deleteTitle'), t('activitiesList.deleteBody', { name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => void deleteActivity(id) },
    ]);
  }

  return (
    <ScreenShell title={t('titles.activity')}>
      <ScreenScroll contentContainerStyle={styles.scroll} gap={16}>
        {activities.length === 0 ? (
          <EmptyState
            icon="map.fill"
            title={t('activitiesList.emptyTitle')}
            subtitle={t('activitiesList.emptySub')}
          />
        ) : (
          <GroupedList>
            {activities.map((item, i) => {
              const tagged = contactName(item.contactId);
              return (
                <GroupedRow
                  key={item.id}
                  icon="map.fill"
                  title={item.name}
                  subtitle={
                    <>
                      {item.description ? (
                        <ThemedText
                          style={[styles.sub, { color: colors.textSecondary }]}
                          numberOfLines={2}
                        >
                          {item.description}
                        </ThemedText>
                      ) : null}
                      {item.address ? (
                        <ThemedText
                          style={[styles.sub, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {item.address}
                        </ThemedText>
                      ) : null}
                      {item.website ? (
                        <ThemedText
                          style={[styles.sub, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {item.website}
                        </ThemedText>
                      ) : null}
                      {tagged ? (
                        <ThemedText
                          style={[styles.sub, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {tagged}
                        </ThemedText>
                      ) : null}
                    </>
                  }
                  trailing={
                    <View style={styles.actions}>
                      {item.address ? (
                        <TouchableOpacity
                          onPress={() =>
                            void Linking.openURL(googleMapsSearchUrl(item.address!, item.placeId))
                          }
                          accessibilityRole="button"
                          accessibilityLabel={t('activitiesList.openMaps')}
                        >
                          <IconSymbol name="map.fill" size={18} color={colors.tint} />
                        </TouchableOpacity>
                      ) : null}
                      {normalizeWebsiteUrl(item.website ?? '') ? (
                        <TouchableOpacity
                          onPress={() => {
                            const href = normalizeWebsiteUrl(item.website ?? '');
                            if (href) void Linking.openURL(href);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={t('activitiesList.openWebsite')}
                        >
                          <IconSymbol name="globe" size={18} color={colors.tint} />
                        </TouchableOpacity>
                      ) : null}
                      {canWrite ? (
                        <TouchableOpacity
                          onPress={() => confirmDelete(item.id, item.name)}
                          accessibilityRole="button"
                          accessibilityLabel={t('a11y.delete')}
                        >
                          <IconSymbol name="trash" size={16} color={colors.error} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  }
                  onPress={
                    canWrite
                      ? () =>
                          router.push(
                            `/(app)/estates/${estateId}/activity/${item.id}` as never
                          )
                      : item.address
                        ? () => void Linking.openURL(googleMapsSearchUrl(item.address!, item.placeId))
                        : normalizeWebsiteUrl(item.website ?? '')
                          ? () => {
                              const href = normalizeWebsiteUrl(item.website ?? '');
                              if (href) void Linking.openURL(href);
                            }
                          : undefined
                  }
                  isLast={i === activities.length - 1}
                />
              );
            })}
          </GroupedList>
        )}

        {canWrite ? (
          <FilledButton
            label={t('activitiesList.addCta')}
            onPress={goNew}
            style={{ marginTop: 20 }}
          />
        ) : null}
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 8 },
  sub: { fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
});
