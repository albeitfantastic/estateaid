/** @deprecated Use EstateInviteRole in types/invitation for per-property invite level only. */
export type LegacyUserRole = 'owner' | 'guest';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
  /** App-managed free trial end (ISO). Grants 1 slot while in the future. */
  trialEndsAt?: string | null;
  trialStartedAt?: string | null;
  /** Once true, start_app_trial will not grant again. */
  hasUsedTrial?: boolean;
  /** Legacy Pro grandfather slot floor from migration. */
  grandfatheredSlots?: number | null;
}
