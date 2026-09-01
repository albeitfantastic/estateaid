import { useLocalSearchParams } from 'expo-router';

import { IssueThreadScreen } from '@/components/maintenance/issue-thread-screen';
import { MaintenanceForm } from '@/components/maintenance/maintenance-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { isIssueTask } from '@/lib/issue-task';
import { useEventStore } from '@/store/event-store';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

function paramId(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return '';
}

export default function EstateEventDetailScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    estateId: string | string[];
    eventId: string | string[];
    fromHome?: string | string[];
  }>();
  const estateId = paramId(params.estateId);
  const eventId = paramId(params.eventId);
  const events = useEventStore((s) => s.events);
  const event = events.find((e) => e.id === eventId);
  const fromHome = paramId(params.fromHome) === '1';

  if (!event) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{t('maintenanceSchedule.notFound')}</ThemedText>
      </ThemedView>
    );
  }

  if (isIssueTask(event)) {
    return <IssueThreadScreen event={event} estateId={estateId} fromHome={fromHome} />;
  }

  return <MaintenanceForm estateId={estateId} event={event} fromHome={fromHome} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
