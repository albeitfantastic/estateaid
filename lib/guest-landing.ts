import { normalizeInviteRole, type Invitation } from '@/types';

/** Post-accept destination: guests get the spec §9.3 landing, hosts get the hub. */
export function estateHrefAfterInviteAccept(inv: Pick<Invitation, 'estateId' | 'role'>): string {
  if (normalizeInviteRole(inv.role) === 'owner') {
    return `/(app)/estates/${inv.estateId}`;
  }
  return `/(app)/estates/${inv.estateId}?landing=1`;
}
