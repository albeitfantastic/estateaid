/** @deprecated Use EstateInviteRole in types/invitation for per-property invite level only. */
export type LegacyUserRole = 'owner' | 'guest';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
  /** Leftover app-managed trial end (ISO). New users use store intro expiration from CustomerInfo. */
  trialEndsAt?: string | null;
  trialStartedAt?: string | null;
  /** Once true, start_app_trial will not grant again (legacy / __DEV__ only). */
  hasUsedTrial?: boolean;
  /** Legacy Pro grandfather slot floor from migration. */
  grandfatheredSlots?: number | null;
}
