import { useContactStore } from '@/store/contact-store';
import { useDocumentStore } from '@/store/document-store';
import { useEstateStore } from '@/store/estate-store';
import { useEventStore } from '@/store/event-store';
import { useFaqStore } from '@/store/faq-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useProfileStore } from '@/store/profile-store';
import { useStayStore } from '@/store/stay-store';
import { useTicketStore } from '@/store/ticket-store';

export async function loadAllStores(): Promise<void> {
  await Promise.all([
    useEstateStore.getState().fetchFromSupabase(),
    useStayStore.getState().fetchFromSupabase(),
    useInvitationStore.getState().fetchFromSupabase(),
    useProfileStore.getState().fetchFromSupabase(),
    useContactStore.getState().fetchFromSupabase(),
    useDocumentStore.getState().fetchFromSupabase(),
    useEventStore.getState().fetchFromSupabase(),
    useTicketStore.getState().fetchFromSupabase(),
    useFaqStore.getState().fetchFromSupabase(),
  ]);
}
