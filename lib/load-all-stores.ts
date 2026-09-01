import { useContactStore } from '@/store/contact-store';
import { useDocumentStore } from '@/store/document-store';
import { useEstateStore } from '@/store/estate-store';
import { useEventStore } from '@/store/event-store';
import { useExpenseStore } from '@/store/expense-store';
import { useFaqStore } from '@/store/faq-store';
import { useHandoverStore } from '@/store/handover-store';
import { useGuestProfileStore } from '@/store/guest-profile-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useProfileStore } from '@/store/profile-store';
import { useStayStore } from '@/store/stay-store';
import { useAvailabilityRuleStore } from '@/store/availability-rule-store';
import { useActivityLogStore } from '@/store/activity-log-store';
import { useStayActivityStore } from '@/store/stay-activity-store';
import { useBootstrapStore } from '@/store/bootstrap-store';

async function runNamed(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    throw new Error(`${label}: ${e instanceof Error ? e.message : 'failed'}`);
  }
}

export async function loadAllStores(): Promise<void> {
  const boot = useBootstrapStore.getState();
  boot.setRetrying(true);
  try {
    const results = await Promise.allSettled([
      runNamed('estates', () => useEstateStore.getState().fetchFromSupabase()),
      runNamed('stays', () => useStayStore.getState().fetchFromSupabase()),
      runNamed('invitations', () => useInvitationStore.getState().fetchFromSupabase()),
      runNamed('guestProfiles', () => useGuestProfileStore.getState().fetchFromSupabase()),
      runNamed('profiles', () => useProfileStore.getState().fetchFromSupabase()),
      runNamed('contacts', () => useContactStore.getState().fetchFromSupabase()),
      runNamed('documents', () => useDocumentStore.getState().fetchFromSupabase()),
      runNamed('events', () => useEventStore.getState().fetchFromSupabase()),
      runNamed('availability', () => useAvailabilityRuleStore.getState().fetchFromSupabase()),
      runNamed('faqs', () => useFaqStore.getState().fetchFromSupabase()),
      runNamed('activity', () => useActivityLogStore.getState().fetchFromSupabase()),
      runNamed('stayActivities', () => useStayActivityStore.getState().fetchFromSupabase()),
      runNamed('expenses', () => useExpenseStore.getState().fetchFromSupabase()),
      runNamed('handover', () => useHandoverStore.getState().fetchFromSupabase()),
    ]);
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    let error: string | null =
      failed.length > 0
        ? failed
            .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)))
            .join('; ')
        : null;

    const ids = useEstateStore.getState().estates.map((e) => e.id);
    if (ids.length > 0) {
      try {
        const { useEstateCoverageStore } = await import('@/store/estate-coverage-store');
        await useEstateCoverageStore.getState().fetchCoverage(ids);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'coverage';
        error = error ? `${error}; coverage: ${msg}` : `coverage: ${msg}`;
      }
    }
    boot.setError(error);
  } finally {
    boot.setRetrying(false);
  }
}
