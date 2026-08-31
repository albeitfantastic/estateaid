import { useLocalSearchParams } from 'expo-router';

import { AvailabilityRulesScreen } from '@/components/availability/availability-rules-screen';

export default function AvailabilityRoute() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  return <AvailabilityRulesScreen estateId={estateId} />;
}
