import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import type { EstateRole } from '@/lib/entitlements/capabilities';

export type EstateCoverageRow = {
  estateId: string;
  covered: boolean;
  sponsorUserId: string;
  sponsorDisplayName: string;
  coOwnerCount: number;
  actorRole: EstateRole;
};

type CoverageState = {
  byId: Record<string, EstateCoverageRow>;
  fetchCoverage: (estateIds: string[]) => Promise<void>;
  clear: () => void;
};

function mapRow(row: Record<string, unknown>): EstateCoverageRow {
  const role = (row.actor_role as string) ?? 'none';
  const actorRole: EstateRole =
    role === 'sponsor' || role === 'coOwner' || role === 'guest' ? role : 'none';
  return {
    estateId: row.estate_id as string,
    covered: Boolean(row.covered),
    sponsorUserId: row.sponsor_user_id as string,
    sponsorDisplayName: (row.sponsor_display_name as string) || 'Sponsor',
    coOwnerCount: Number(row.co_owner_count ?? 0),
    actorRole,
  };
}

export const useEstateCoverageStore = create<CoverageState>((set, get) => ({
  byId: {},
  clear: () => set({ byId: {} }),
  fetchCoverage: async (estateIds) => {
    const ids = [...new Set(estateIds.filter(Boolean))];
    if (ids.length === 0) return;
    const { data, error } = await supabase.rpc('estate_coverage_for_ids', { p_ids: ids });
    if (error || !data) {
      // Fallback: leave existing cache; client can still derive role from local data.
      return;
    }
    const next = { ...get().byId };
    for (const row of data as Record<string, unknown>[]) {
      const mapped = mapRow(row);
      next[mapped.estateId] = mapped;
    }
    set({ byId: next });
  },
}));
