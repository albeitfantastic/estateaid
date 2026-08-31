import { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components/ui/empty-state';
import {
  GroupedList,
  GroupedRow,
  ScreenScroll,
  ScreenShell,
} from '@/components/ui/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { formatDate } from '@/lib/date-utils';
import { useActivityLogStore } from '@/store/activity-log-store';
import { resolveUserDisplayName, useProfileStore } from '@/store/profile-store';
import type { EstateActivityAction } from '@/types';

const ACTION_LABELS: Record<EstateActivityAction, string> = {
  estate_created: 'created this property',
  estate_updated: 'updated this property',
  invitation_sent: 'sent an invitation',
  invitation_accepted: 'accepted an invitation',
  invitation_declined: 'declined an invitation',
  invitation_revoked: 'revoked an invitation',
  stay_request_approved: 'approved a stay request',
  stay_request_declined: 'declined a stay request',
  stay_request_alternative_proposed: 'proposed alternative dates',
  stay_request_cancelled: 'cancelled a stay request',
};

export default function ActivityLogScreen() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const { getEntriesByEstate, fetchFromSupabase } = useActivityLogStore();
  const profileById = useProfileStore((s) => s.byId);
  const entries = getEntriesByEstate(estateId);

  useFocusEffect(
    useCallback(() => {
      void fetchFromSupabase();
    }, [fetchFromSupabase])
  );

  return (
    <ScreenShell title="Activity">
      {entries.length === 0 ? (
        <EmptyState
          icon="clock.fill"
          title="No activity yet"
          subtitle="Actions on this property will show up here."
        />
      ) : (
        <ScreenScroll>
          <GroupedList>
            {entries.map((entry, i) => {
              const actorName = resolveUserDisplayName(entry.actorId, profileById);
              const dateLabel = entry.createdAt.length >= 10 ? formatDate(entry.createdAt.slice(0, 10)) : '';
              return (
                <GroupedRow
                  key={entry.id}
                  title={
                    <ThemedText style={styles.line}>
                      <ThemedText type="defaultSemiBold">{actorName}</ThemedText>{' '}
                      {ACTION_LABELS[entry.action]}
                    </ThemedText>
                  }
                  subtitle={dateLabel}
                  isLast={i === entries.length - 1}
                />
              );
            })}
          </GroupedList>
        </ScreenScroll>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  line: { fontSize: 14, lineHeight: 20 },
});
