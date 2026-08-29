import { useMemo } from 'react';

import { useAccessTier, type AccessTier } from '@/lib/access-tier';
import { CO_OWNER_CAP } from '@/lib/entitlements/constants';
import { useAuthStore } from '@/store/auth-store';
import { useEstateCoverageStore } from '@/store/estate-coverage-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { getEstateActorRole } from '@/lib/estate-role';
import { normalizeInviteRole, type Invitation } from '@/types/invitation';

export type Tier = AccessTier;

export type EstateRole = 'sponsor' | 'coOwner' | 'guest' | 'none';

export type Capability =
  | 'estate.create'
  | 'estate.edit'
  | 'documents.read'
  | 'documents.upload'
  | 'contacts.read'
  | 'contacts.write'
  | 'faq.read'
  | 'faq.write'
  | 'availability.read'
  | 'availability.write'
  | 'events.read'
  | 'events.write'
  | 'guests.invite'
  | 'coOwners.invite'
  | 'stays.request'
  | 'stays.approve'
  | 'calendar.view'
  | 'activity.view';

export interface EstateContext {
  estateId: string;
  role: EstateRole;
  covered: boolean;
  coOwnerCount: number;
}

export interface AccountContext {
  tier: Tier;
  sponsoredEstateCount: number;
}

/** Caps available on an uncovered estate the actor sponsors (standard own property). */
const UNCOVERED_SPONSOR_CAPS: Capability[] = [
  'estate.edit',
  'documents.read',
  'contacts.read',
  'faq.read',
  'availability.read',
  'events.read',
  'calendar.view',
  'activity.view',
];

const HOST_CAPS: Capability[] = [
  'estate.edit',
  'documents.read',
  'documents.upload',
  'contacts.read',
  'contacts.write',
  'faq.read',
  'faq.write',
  'availability.read',
  'availability.write',
  'events.read',
  'events.write',
  'guests.invite',
  'coOwners.invite',
  'stays.approve',
  'calendar.view',
  'activity.view',
];

const GUEST_CAPS: Capability[] = [
  'stays.request',
  'documents.read',
  'contacts.read',
  'faq.read',
  'availability.read',
  'events.read',
  'calendar.view',
  'activity.view',
];

function isHost(role: EstateRole): boolean {
  return role === 'sponsor' || role === 'coOwner';
}

/**
 * Single source of truth for feature gating (estate-scoped sponsorship).
 * estate.create is account-scoped; all other caps require EstateContext.
 *
 * Regression (manual):
 * - Standard co-owner on covered estate → full host caps
 * - Same user New estate → create paywall (co-owner pitch when applicable)
 * - Co-owned does not increment sponsoredEstateCount
 * - Sponsor lapse → coOwner read-only + transfer/upgrade banner
 * - coOwners.invite respects CO_OWNER_CAP
 */
export function can(
  cap: Capability,
  account: AccountContext,
  estate?: EstateContext
): boolean {
  if (cap === 'estate.create') {
    if (account.tier === 'trial' || account.tier === 'pro') return true;
    return account.sponsoredEstateCount === 0;
  }

  if (!estate) {
    if (__DEV__) {
      throw new Error(`Capability "${cap}" requires EstateContext`);
    }
    return false;
  }

  if (cap === 'stays.request') {
    return estate.role === 'guest' || isHost(estate.role);
  }

  if (GUEST_CAPS.includes(cap) && estate.role === 'guest') {
    // Guest reads never depend on covered (§2.5 / §2.4)
    return true;
  }

  if (!isHost(estate.role)) return false;

  if (cap === 'coOwners.invite') {
    return (
      estate.covered &&
      estate.coOwnerCount < CO_OWNER_CAP &&
      HOST_CAPS.includes(cap)
    );
  }

  if (estate.covered) {
    return HOST_CAPS.includes(cap);
  }

  // Uncovered: sponsor keeps a limited subset; co-owners get no host writes
  if (estate.role === 'sponsor') {
    return UNCOVERED_SPONSOR_CAPS.includes(cap);
  }

  // Uncovered coOwner: read-only host views
  const readOnly: Capability[] = [
    'documents.read',
    'contacts.read',
    'faq.read',
    'availability.read',
    'events.read',
    'calendar.view',
    'activity.view',
  ];
  return readOnly.includes(cap);
}

export function useAccountContext(): AccountContext {
  const tier = useAccessTier();
  const currentUserId = useAuthStore((s) => s.currentUser?.id);
  const estates = useEstateStore((s) => s.estates);
  return useMemo(() => {
    const sponsoredEstateCount = estates.filter((e) => e.sponsorUserId === currentUserId).length;
    return { tier, sponsoredEstateCount };
  }, [tier, estates, currentUserId]);
}

/** Build EstateContext from stores + coverage cache (fallback to local role/covered heuristics). */
export function resolveEstateContext(
  estateId: string,
  opts: {
    currentUserId?: string | null;
    userEmail?: string | null;
    estates: { id: string; ownerId: string; sponsorUserId: string }[];
    invitations: Invitation[];
    coverageById: Record<string, { covered: boolean; coOwnerCount: number; actorRole: EstateRole; sponsorUserId: string }>;
    actorTier: Tier;
  }
): EstateContext {
  const coverage = opts.coverageById[estateId];
  const estate = opts.estates.find((e) => e.id === estateId);
  const role =
    coverage?.actorRole ??
    getEstateActorRole(
      opts.estates,
      opts.invitations,
      estateId,
      opts.currentUserId ?? '',
      opts.userEmail
    );

  let covered = coverage?.covered;
  if (covered == null && estate) {
    // Heuristic before RPC: if actor is sponsor, use their own tier
    if (estate.sponsorUserId === opts.currentUserId) {
      covered = opts.actorTier === 'trial' || opts.actorTier === 'pro';
    } else {
      covered = false;
    }
  }

  let coOwnerCount = coverage?.coOwnerCount;
  if (coOwnerCount == null) {
    const sponsorId = estate?.sponsorUserId;
    const ownerId = estate?.ownerId;
    let n = ownerId && sponsorId && ownerId !== sponsorId ? 1 : 0;
    for (const inv of opts.invitations) {
      if (
        inv.estateId === estateId &&
        (inv.status === 'accepted' || inv.status === 'pending') &&
        normalizeInviteRole(inv.role) === 'coOwner' &&
        inv.guestId !== sponsorId &&
        inv.guestId !== ownerId
      ) {
        n += 1;
      }
    }
    coOwnerCount = n;
  }

  return {
    estateId,
    role,
    covered: Boolean(covered),
    coOwnerCount,
  };
}

export function useCan(): (cap: Capability, estateIdOrCtx?: string | { estateId: string }) => boolean {
  const account = useAccountContext();
  const currentUser = useAuthStore((s) => s.currentUser);
  const estates = useEstateStore((s) => s.estates);
  const invitations = useInvitationStore((s) => s.invitations);
  const coverageById = useEstateCoverageStore((s) => s.byId);

  return useMemo(() => {
    return (cap: Capability, estateIdOrCtx?: string | { estateId: string }) => {
      if (cap === 'estate.create') {
        return can(cap, account);
      }
      const estateId =
        typeof estateIdOrCtx === 'string' ? estateIdOrCtx : estateIdOrCtx?.estateId;
      if (!estateId) {
        return can(cap, account, undefined);
      }
      const estate = resolveEstateContext(estateId, {
        currentUserId: currentUser?.id,
        userEmail: currentUser?.email,
        estates,
        invitations,
        coverageById,
        actorTier: account.tier,
      });
      return can(cap, account, estate);
    };
  }, [account, currentUser, estates, invitations, coverageById]);
}

/** @deprecated Prefer useCan — kept for settings labels. */
export function useHasPaidHostAccess(): boolean {
  return useAccessTier() !== 'standard';
}

/** @deprecated Use sponsored estates / coverage instead. */
export function useOwnedEstateContext() {
  const currentUserId = useAuthStore((s) => s.currentUser?.id);
  const estates = useEstateStore((s) => s.estates);
  return useMemo(() => {
    const owned = estates.filter((e) => e.ownerId === currentUserId || e.sponsorUserId === currentUserId);
    return {
      owned,
      ownedEstateCount: owned.length,
      primaryEstateId: owned.sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]?.id ?? null,
      sponsoredEstateCount: estates.filter((e) => e.sponsorUserId === currentUserId).length,
    };
  }, [estates, currentUserId]);
}

export { CO_OWNER_CAP };
