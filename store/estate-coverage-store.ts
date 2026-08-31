import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import type { PropertyRole } from '@/lib/entitlements/capabilities';

export type EstateCoverageRow = {
  estateId: string;
  covered: boolean;
  sponsorUserId: string;
  sponsorDisplayName: string;
  /** Invited owners only (excludes sponsor). */
  coOwnerCount: number;
  /** Includes sponsor. */
  ownerCount: number;
  actorRole: PropertyRole;
  slotHeld?: boolean;
  sponsorOverAllocated?: boolean;
  stayWindowActive?: boolean;
};

type CoverageState = {
  byId: Record<string, EstateCoverageRow>;
  fetchCoverage: (estateIds: string[]) => Promise<void>;
  clear: () => void;
};

function mapRole(role: string): PropertyRole {
  if (role === 'sponsor' || role === 'owner' || role === 'guest') return role;
  if (role === 'coOwner') return 'owner';
  return 'none';
}

function mapRow(row: Record<string, unknown>): EstateCoverageRow {
  const coOwnerCount = Number(row.co_owner_count ?? 0);
  const ownerCount = Number(row.owner_count ?? coOwnerCount + 1);
  return {
    estateId: row.estate_id as string,
    covered: Boolean(row.covered),
    sponsorUserId: row.sponsor_user_id as string,
    sponsorDisplayName: (row.sponsor_display_name as string) || 'Sponsor',
    coOwnerCount,
    ownerCount,
    actorRole: mapRole((row.actor_role as string) ?? 'none'),
    slotHeld: row.slot_held != null ? Boolean(row.slot_held) : undefined,
    sponsorOverAllocated:
      row.sponsor_over_allocated != null ? Boolean(row.sponsor_over_allocated) : undefined,
  };
}

export const useEstateCoverageStore = create<CoverageState>((set, get) => ({
  byId: {},
  clear: () => set({ byId: {} }),
  fetchCoverage: async (estateIds) => {
    const ids = [...new Set(estateIds.filter(Boolean))];
    if (ids.length === 0) return;
    const { data, error } = await supabase.rpc('estate_coverage_for_ids', { p_ids: ids });
    if (error) throw new Error(error.message);
    if (!data) return;
    const next = { ...get().byId };
    let changed = false;
    for (const row of data as Record<string, unknown>[]) {
      const mapped = mapRow(row);
      const prev = next[mapped.estateId];
      if (
        !prev ||
        prev.covered !== mapped.covered ||
        prev.ownerCount !== mapped.ownerCount ||
        prev.coOwnerCount !== mapped.coOwnerCount ||
        prev.actorRole !== mapped.actorRole ||
        prev.sponsorUserId !== mapped.sponsorUserId ||
        prev.slotHeld !== mapped.slotHeld ||
        prev.sponsorOverAllocated !== mapped.sponsorOverAllocated
      ) {
        next[mapped.estateId] = mapped;
        changed = true;
      }
    }
    if (changed) set({ byId: next });
  },
}));
