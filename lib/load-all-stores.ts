import { useContactStore } from '@/store/contact-store';
import { useDocumentStore } from '@/store/document-store';
import { useEstateStore } from '@/store/estate-store';
import { useEventStore } from '@/store/event-store';
import { useFaqStore } from '@/store/faq-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useProfileStore } from '@/store/profile-store';
import { useStayStore } from '@/store/stay-store';
import { useAvailabilityRuleStore } from '@/store/availability-rule-store';
import { useActivityLogStore } from '@/store/activity-log-store';
export async function loadAllStores(): Promise<void> {
  await Promise.all([
    useEstateStore.getState().fetchFromSupabase(),
    useStayStore.getState().fetchFromSupabase(),
    useInvitationStore.getState().fetchFromSupabase(),
    useProfileStore.getState().fetchFromSupabase(),
    useContactStore.getState().fetchFromSupabase(),
    useDocumentStore.getState().fetchFromSupabase(),
    useEventStore.getState().fetchFromSupabase(),
    useAvailabilityRuleStore.getState().fetchFromSupabase(),
    useFaqStore.getState().fetchFromSupabase(),
    useActivityLogStore.getState().fetchFromSupabase(),
  ]);
  const ids = useEstateStore.getState().estates.map((e) => e.id);
  if (ids.length > 0) {
    const { useEstateCoverageStore } = await import('@/store/estate-coverage-store');
    await useEstateCoverageStore.getState().fetchCoverage(ids);
  }
}
