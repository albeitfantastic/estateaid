import type { Stay } from '@/types';
import { useContactStore } from '@/store/contact-store';
import { useDocumentStore } from '@/store/document-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useStayStore } from '@/store/stay-store';

export type SetupStepId = 'block' | 'invite' | 'document' | 'contact';

export const SETUP_STEPS: { id: SetupStepId; route: (estateId: string) => string }[] = [
  { id: 'block', route: (id) => `/(app)/stays/block?estateId=${id}` },
  { id: 'invite', route: (id) => `/(app)/estates/${id}/guests/invite` },
  { id: 'document', route: (id) => `/(app)/estates/${id}/documents/upload` },
  { id: 'contact', route: (id) => `/(app)/estates/${id}/contacts/new` },
];

/** Hub tile `route` that corresponds to the next checklist step. */
export const SETUP_STEP_TILE: Record<SetupStepId, string> = {
  block: 'stays',
  invite: 'guests',
  document: 'documents',
  contact: 'contacts',
};

/** Host-created stay (Block dates), not an approved guest request. */
export function isBlockedStay(stay: Stay): boolean {
  return !stay.stayRequestId;
}

export function setupDoneForEstate(estateId: string): Record<SetupStepId, boolean> {
  const docs = useDocumentStore.getState().documents.filter((d) => d.estateId === estateId);
  const contacts = useContactStore.getState().contacts.filter((c) => c.estateId === estateId);
  const invites = useInvitationStore
    .getState()
    .invitations.filter((i) => i.estateId === estateId && i.status !== 'revoked');
  const blocked = useStayStore
    .getState()
    .stays.filter((st) => st.estateId === estateId && isBlockedStay(st));
  return {
    block: blocked.length > 0,
    invite: invites.length > 0,
    document: docs.length > 0,
    contact: contacts.length > 0,
  };
}

export function nextSetupStep(estateId: string): SetupStepId | null {
  const done = setupDoneForEstate(estateId);
  return SETUP_STEPS.find((s) => !done[s.id])?.id ?? null;
}
