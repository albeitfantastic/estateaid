import { useMemo } from 'react';

import { deriveSlotCount, hasUsedTrialFlag } from '@/lib/access-tier-core';
import { OWNER_CAP } from '@/lib/entitlements/constants';
import { getEstateActorRole } from '@/lib/estate-role';
import { useAuthStore } from '@/store/auth-store';
import { useEstateCoverageStore } from '@/store/estate-coverage-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';
import { useSubscription } from '@/providers/subscription-provider';
import type { Estate } from '@/types/estate';
import { normalizeInviteRole, type Invitation } from '@/types/invitation';

export type PropertyRole = 'sponsor' | 'owner' | 'guest' | 'none';
/** @deprecated Use PropertyRole */
export type EstateRole = PropertyRole;

export type Capability =
  | 'property.create'
  | 'property.edit'
  | 'property.delete'
  | 'property.transferSponsorship'
  | 'documents.read'
  | 'documents.write'
  | 'contacts.read'
  | 'contacts.write'
  | 'faq.read'
  | 'faq.write'
  | 'events.read'
  | 'events.write'
  | 'availability.read'
  | 'availability.write'
  | 'dates.block'
  | 'dates.request'
  | 'stays.approve'
  | 'guests.invite'
  | 'owners.invite'
  | 'calendar.view'
  | 'activity.view'
  // Legacy aliases (map in can())
  | 'estate.create'
  | 'estate.edit'
  | 'documents.upload'
  | 'coOwners.invite'
  | 'stays.request';

export interface AccountContext {
  slotCount: number;
  propertiesSponsored: number;
  hasUsedTrial: boolean;
}

export interface PropertyContext {
  propertyId: string;
  role: PropertyRole;
  covered: boolean;
  ownerCount: number;
  stayWindowActive: boolean;
}

/** @deprecated Use PropertyContext */
export type EstateContext = {
  estateId: string;
  role: PropertyRole;
  covered: boolean;
  coOwnerCount: number;
  ownerCount?: number;
  stayWindowActive?: boolean;
};

const WRITE_CAPS: Capability[] = [
  'property.edit',
  'documents.write',
  'contacts.write',
  'faq.write',
  'events.write',
  'availability.write',
  'dates.block',
  'stays.approve',
  'guests.invite',
];

const READ_CAPS: Capability[] = [
  'documents.read',
  'contacts.read',
  'faq.read',
  'events.read',
  'availability.read',
  'calendar.view',
  'activity.view',
];

function normalizeCap(cap: Capability): Capability {
  if (cap === 'estate.create') return 'property.create';
  if (cap === 'estate.edit') return 'property.edit';
  if (cap === 'documents.upload') return 'documents.write';
  if (cap === 'coOwners.invite') return 'owners.invite';
  if (cap === 'stays.request') return 'dates.request';
  return cap;
}

function isHost(role: PropertyRole): boolean {
  return role === 'sponsor' || role === 'owner';
}

/**
 * Single source of truth for feature gating (slot economy — docs/spec.md §4).
 */
export function can(
  cap: Capability,
  account: AccountContext,
  property?: PropertyContext | EstateContext
): boolean {
  const c = normalizeCap(cap);

  if (c === 'property.create') {
    return account.slotCount > account.propertiesSponsored;
  }

  if (!property) {
    if (__DEV__) {
      throw new Error(`Capability "${c}" requires PropertyContext`);
    }
    return false;
  }

  const ctx: PropertyContext =
    'propertyId' in property
      ? property
      : {
          propertyId: property.estateId,
          role: property.role,
          covered: property.covered,
          ownerCount: property.ownerCount ?? property.coOwnerCount + 1,
          stayWindowActive: property.stayWindowActive ?? true,
        };

  if (c === 'dates.request') {
    return ctx.role === 'guest' || isHost(ctx.role);
  }

  if (READ_CAPS.includes(c) && ctx.role === 'guest') {
    return ctx.stayWindowActive;
  }

  if (!isHost(ctx.role)) return false;

  if (c === 'owners.invite' || c === 'property.delete' || c === 'property.transferSponsorship') {
    if (c === 'property.transferSponsorship') {
      // §7: an owner with a free slot takes over (account free-slot checked by caller).
      return ctx.role === 'owner';
    }
    if (ctx.role !== 'sponsor') return false;
    if (c === 'owners.invite') {
      return ctx.covered && ctx.ownerCount < OWNER_CAP;
    }
    return true; // property.delete
  }

  if (WRITE_CAPS.includes(c) || c === 'property.edit') {
    return ctx.covered && isHost(ctx.role);
  }

  if (READ_CAPS.includes(c)) {
    return true;
  }

  return false;
}

export function useAccountContext(): AccountContext {
  const currentUser = useAuthStore((s) => s.currentUser);
  const estates = useEstateStore((s) => s.estates);
  const { slotCount } = useSubscription();
  return useMemo(() => {
    const propertiesSponsored = estates.filter((e) => e.sponsorUserId === currentUser?.id).length;
    return {
      slotCount,
      propertiesSponsored,
      hasUsedTrial: hasUsedTrialFlag({
        hasUsedTrial: (currentUser as { hasUsedTrial?: boolean } | null)?.hasUsedTrial,
        trialEndsAt: currentUser?.trialEndsAt,
        trialStartedAt: currentUser?.trialStartedAt,
      }),
    };
  }, [currentUser, estates, slotCount]);
}

export function resolveEstateContext(
  estateId: string,
  opts: {
    currentUserId?: string | null;
    userEmail?: string | null;
    estates: { id: string; ownerId: string; sponsorUserId: string }[];
    invitations: Invitation[];
    coverageById: Record<
      string,
      {
        covered: boolean;
        coOwnerCount: number;
        ownerCount?: number;
        actorRole: PropertyRole;
        sponsorUserId: string;
        stayWindowActive?: boolean;
      }
    >;
    slotCount: number;
  }
): PropertyContext {
  const coverage = opts.coverageById[estateId];
  const estate = opts.estates.find((e) => e.id === estateId);
  let role =
    coverage?.actorRole ??
    getEstateActorRole(
      opts.estates,
      opts.invitations,
      estateId,
      opts.currentUserId ?? '',
      opts.userEmail
    );
  if (role === ('coOwner' as PropertyRole)) role = 'owner';

  let covered = coverage?.covered;
  if (covered == null && estate) {
    if (estate.sponsorUserId === opts.currentUserId) {
      covered = opts.slotCount > 0;
    } else {
      covered = false;
    }
  }

  let ownerCount = coverage?.ownerCount;
  if (ownerCount == null) {
    const sponsorId = estate?.sponsorUserId;
    const ownerId = estate?.ownerId;
    let n = 1; // sponsor
    if (ownerId && sponsorId && ownerId !== sponsorId) n += 1;
    for (const inv of opts.invitations) {
      if (
        inv.estateId === estateId &&
        (inv.status === 'accepted' || inv.status === 'pending') &&
        normalizeInviteRole(inv.role) === 'owner' &&
        inv.guestId !== sponsorId &&
        inv.guestId !== ownerId
      ) {
        n += 1;
      }
    }
    ownerCount = n;
  }

  return {
    propertyId: estateId,
    role,
    covered: Boolean(covered),
    ownerCount,
    stayWindowActive: coverage?.stayWindowActive ?? true,
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
      if (normalizeCap(cap) === 'property.create') {
        return can(cap, account);
      }
      const estateId =
        typeof estateIdOrCtx === 'string' ? estateIdOrCtx : estateIdOrCtx?.estateId;
      if (!estateId) {
        return can(cap, account, undefined);
      }
      const property = resolveEstateContext(estateId, {
        currentUserId: currentUser?.id,
        userEmail: currentUser?.email,
        estates,
        invitations,
        coverageById,
        slotCount: account.slotCount,
      });
      return can(cap, account, property);
    };
  }, [account, currentUser, estates, invitations, coverageById]);
}

/** True when user holds any paid/trial slots. */
export function useHasPaidHostAccess(): boolean {
  return useAccountContext().slotCount > 0;
}

export interface ManagedEstates {
  /** Properties where the actor is sponsor or host, in store order. */
  estates: Estate[];
  estateIds: string[];
  /** Resolved role for every known property, managed or not. */
  roleById: Record<string, PropertyRole>;
  isManaged: (estateId: string) => boolean;
}

/**
 * Shared replacement for `estate.ownerId === currentUser.id` filters.
 *
 * Resolves the actor role from the server-derived coverage store when it is
 * loaded, falling back to local invitation state, so an invited Host sees the
 * properties they co-manage (spec §3) rather than only the ones they created.
 */
export function useManagedEstates(): ManagedEstates {
  const currentUser = useAuthStore((s) => s.currentUser);
  const estates = useEstateStore((s) => s.estates);
  const invitations = useInvitationStore((s) => s.invitations);
  const coverageById = useEstateCoverageStore((s) => s.byId);

  return useMemo(() => {
    const roleById: Record<string, PropertyRole> = {};
    const managed: Estate[] = [];
    for (const estate of estates) {
      let role =
        coverageById[estate.id]?.actorRole ??
        getEstateActorRole(
          estates,
          invitations,
          estate.id,
          currentUser?.id ?? '',
          currentUser?.email
        );
      if (role === ('coOwner' as PropertyRole)) role = 'owner';
      roleById[estate.id] = role;
      if (isHost(role)) managed.push(estate);
    }
    const estateIds = managed.map((e) => e.id);
    const managedIds = new Set(estateIds);
    return {
      estates: managed,
      estateIds,
      roleById,
      isManaged: (estateId: string) => managedIds.has(estateId),
    };
  }, [estates, invitations, currentUser, coverageById]);
}

export { OWNER_CAP, CO_OWNER_CAP } from '@/lib/entitlements/constants';
export { deriveSlotCount };
