import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EstateAvailabilityRule } from '@/types/availability-rule';
import { supabase } from '@/lib/supabase';
import { dedupeById } from '@/lib/dedup-by-id';

function fromDb(row: Record<string, unknown>): EstateAvailabilityRule {
  return {
    id: row.id as string,
    estateId: row.estate_id as string,
    kind: row.kind as EstateAvailabilityRule['kind'],
    title: (row.title as string | undefined) ?? undefined,
    from: row.date_from ? String(row.date_from).slice(0, 10) : undefined,
    to: row.date_to ? String(row.date_to).slice(0, 10) : undefined,
    annualFrom: (row.annual_from as string | undefined) ?? undefined,
    annualTo: (row.annual_to as string | undefined) ?? undefined,
    minNights: row.min_nights != null ? Number(row.min_nights) : undefined,
    maxAdvanceDays: row.max_advance_days != null ? Number(row.max_advance_days) : undefined,
    enabled: row.enabled !== false,
    createdAt: (row.created_at ?? '') as string,
  };
}

function toDb(r: EstateAvailabilityRule) {
  return {
    id: r.id,
    estate_id: r.estateId,
    kind: r.kind,
    title: r.title ?? null,
    date_from: r.from ?? null,
    date_to: r.to ?? null,
    annual_from: r.annualFrom ?? null,
    annual_to: r.annualTo ?? null,
    min_nights: r.minNights ?? null,
    max_advance_days: r.maxAdvanceDays ?? null,
    enabled: r.enabled,
    created_at: r.createdAt,
  };
}

interface AvailabilityRuleState {
  rules: EstateAvailabilityRule[];
  setRules: (rules: EstateAvailabilityRule[]) => void;
  fetchFromSupabase: () => Promise<void>;
  addRule: (rule: EstateAvailabilityRule) => Promise<{ error: string | null }>;
  updateRule: (id: string, patch: Partial<EstateAvailabilityRule>) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  getRulesByEstate: (estateId: string) => EstateAvailabilityRule[];
}

export const useAvailabilityRuleStore = create<AvailabilityRuleState>()(
  persist(
    (set, get) => ({
      rules: [],
      setRules: (rules) => set({ rules }),
      fetchFromSupabase: async () => {
        const { data, error } = await supabase.from('estate_availability_rules').select('*');
        if (error) throw new Error(error.message);
        if (data) set({ rules: dedupeById(data).map(fromDb) });
      },
      addRule: async (rule) => {
        set((s) => ({ rules: [...s.rules, rule] }));
        const { error } = await supabase.from('estate_availability_rules').insert(toDb(rule));
        if (error) {
          set((s) => ({ rules: s.rules.filter((x) => x.id !== rule.id) }));
          return { error: error.message };
        }
        return { error: null };
      },
      updateRule: async (id, patch) => {
        set((s) => ({
          rules: s.rules.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        }));
        const dbPatch: Record<string, unknown> = {};
        if (patch.title !== undefined) dbPatch.title = patch.title;
        if (patch.from !== undefined) dbPatch.date_from = patch.from ?? null;
        if (patch.to !== undefined) dbPatch.date_to = patch.to ?? null;
        if (patch.annualFrom !== undefined) dbPatch.annual_from = patch.annualFrom ?? null;
        if (patch.annualTo !== undefined) dbPatch.annual_to = patch.annualTo ?? null;
        if (patch.minNights !== undefined) dbPatch.min_nights = patch.minNights ?? null;
        if (patch.maxAdvanceDays !== undefined) dbPatch.max_advance_days = patch.maxAdvanceDays ?? null;
        if (patch.enabled !== undefined) dbPatch.enabled = patch.enabled;
        if (patch.kind !== undefined) dbPatch.kind = patch.kind;
        await supabase.from('estate_availability_rules').update(dbPatch).eq('id', id);
      },
      deleteRule: async (id) => {
        set((s) => ({ rules: s.rules.filter((x) => x.id !== id) }));
        await supabase.from('estate_availability_rules').delete().eq('id', id);
      },
      getRulesByEstate: (estateId) => get().rules.filter((r) => r.estateId === estateId),
    }),
    {
      name: '@maison/availability-rules',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
