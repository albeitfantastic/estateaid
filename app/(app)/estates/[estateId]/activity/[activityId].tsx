import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { ActivityForm } from '@/components/activities/activity-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useStayActivityStore } from '@/store/stay-activity-store';

function paramId(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return '';
}

export default function EditActivity() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    estateId?: string | string[];
    activityId?: string | string[];
  }>();
  const estateId = paramId(params.estateId);
  const activityId = paramId(params.activityId);
  const activity = useStayActivityStore((s) => s.activities.find((a) => a.id === activityId));

  if (!activity) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{t('activitiesList.notFound')}</ThemedText>
      </ThemedView>
    );
  }

  return <ActivityForm estateId={estateId} activity={activity} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
