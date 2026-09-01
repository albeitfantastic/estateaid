import { useLocalSearchParams } from 'expo-router';

import { ActivityForm } from '@/components/activities/activity-form';

function paramId(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return '';
}

export default function NewActivity() {
  const params = useLocalSearchParams<{ estateId?: string | string[] }>();
  return <ActivityForm estateId={paramId(params.estateId)} />;
}
