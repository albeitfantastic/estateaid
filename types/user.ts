/** @deprecated Use EstateInviteRole in types/invitation for per-property invite level only. */
export type LegacyUserRole = 'owner' | 'guest';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
  /** App-managed free trial end (ISO). Full host features while in future. */
  trialEndsAt?: string | null;
  trialStartedAt?: string | null;
}
