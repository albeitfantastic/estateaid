import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { dedupeById } from '@/lib/dedup-by-id';
import { generateUuidV4 } from '@/lib/id';
import { DEFAULT_HANDOVER_ITEMS } from '@/lib/onboarding-starters';
import { supabase } from '@/lib/supabase';
import { isTransportError } from '@/lib/supabase-write-error';
import { useAuthStore } from '@/store/auth-store';

export type HandoverTemplate = {
  estateId: string;
  items: string[];
  updatedAt?: string;
};

export type HandoverCompletion = {
  id: string;
  estateId: string;
  stayId: string;
  guestId: string;
  checked: Record<string, boolean>;
  updatedAt: string;
};

function asStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string');
}

function asCheckedMap(raw: unknown): Record<string, boolean> {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    out[key] = Boolean(value);
  }
  return out;
}

function templateFromDb(row: Record<string, unknown>): HandoverTemplate {
  return {
    estateId: row.estate_id as string,
    items: asStringArray(row.items),
    updatedAt: (row.updated_at ?? '') as string,
  };
}

function completionFromDb(row: Record<string, unknown>): HandoverCompletion {
  return {
    id: row.id as string,
    estateId: row.estate_id as string,
    stayId: row.stay_id as string,
    guestId: row.guest_id as string,
    checked: asCheckedMap(row.checked),
    updatedAt: (row.updated_at ?? '') as string,
  };
}

function completionToDb(c: HandoverCompletion) {
  return {
    id: c.id,
    estate_id: c.estateId,
    stay_id: c.stayId,
    guest_id: c.guestId,
    checked: c.checked,
    updated_at: c.updatedAt,
  };
}

type WriteResult = { error: string | null };

interface HandoverState {
  templates: HandoverTemplate[];
  completions: HandoverCompletion[];
  /** Rows written before this device ever reached Supabase. */
  localOnlyTemplateEstateIds: string[];
  localOnlyCompletionIds: string[];
  fetchFromSupabase: () => Promise<void>;
  getTemplateItems: (estateId: string) => string[];
  setTemplateItems: (estateId: string, items: string[]) => Promise<WriteResult>;
  getCompletion: (stayId: string) => HandoverCompletion | undefined;
  toggleItem: (args: {
    estateId: string;
    stayId: string;
    guestId: string;
    item: string;
  }) => Promise<WriteResult>;
}

export const useHandoverStore = create<HandoverState>()(
  persist(
    (set, get) => ({
      templates: [],
      completions: [],
      localOnlyTemplateEstateIds: [],
      localOnlyCompletionIds: [],

      fetchFromSupabase: async () => {
        await pushLocalOnlyRows(set, get);

        const [templateRes, completionRes] = await Promise.all([
          supabase.from('estate_handover_templates').select('*'),
          supabase.from('estate_handover_completions').select('*'),
        ]);

        if (templateRes.error) throw new Error(templateRes.error.message);
        if (templateRes.data) {
          const remote = templateRes.data.map(templateFromDb);
          const stillLocal = get().templates.filter(
            (t) =>
              get().localOnlyTemplateEstateIds.includes(t.estateId) &&
              !remote.some((r) => r.estateId === t.estateId)
          );
          set({ templates: [...stillLocal, ...remote] });
        }

        if (completionRes.error) throw new Error(completionRes.error.message);
        if (completionRes.data) {
          const remote = dedupeById(completionRes.data).map(completionFromDb);
          const stillLocal = get().completions.filter(
            (c) =>
              get().localOnlyCompletionIds.includes(c.id) &&
              !remote.some((r) => r.stayId === c.stayId)
          );
          set({ completions: [...stillLocal, ...remote] });
        }
      },

      getTemplateItems: (estateId) => {
        const t = get().templates.find((x) => x.estateId === estateId);
        return t?.items?.length ? t.items : DEFAULT_HANDOVER_ITEMS;
      },

      setTemplateItems: async (estateId, items) => {
        const previous = get().templates;
        const updatedAt = new Date().toISOString();
        set((s) => ({
          templates: [
            ...s.templates.filter((x) => x.estateId !== estateId),
            { estateId, items, updatedAt },
          ],
        }));

        const userId = useAuthStore.getState().currentUser?.id;
        if (!userId) {
          set((s) => ({
            localOnlyTemplateEstateIds: dedupeStrings([
              ...s.localOnlyTemplateEstateIds,
              estateId,
            ]),
          }));
          return { error: null };
        }

        const { error } = await supabase.from('estate_handover_templates').upsert(
          { estate_id: estateId, items, updated_by: userId, updated_at: updatedAt },
          { onConflict: 'estate_id' }
        );
        if (error) {
          if (isTransportError(error)) {
            set((s) => ({
              localOnlyTemplateEstateIds: dedupeStrings([
                ...s.localOnlyTemplateEstateIds,
                estateId,
              ]),
            }));
            return { error: null };
          }
          set({ templates: previous });
          return { error: error.message };
        }
        set((s) => ({
          localOnlyTemplateEstateIds: s.localOnlyTemplateEstateIds.filter((x) => x !== estateId),
        }));
        return { error: null };
      },

      getCompletion: (stayId) => get().completions.find((c) => c.stayId === stayId),

      toggleItem: async ({ estateId, stayId, guestId, item }) => {
        const previous = get().completions;
        const existing = previous.find((c) => c.stayId === stayId);
        const updatedAt = new Date().toISOString();
        const next: HandoverCompletion = existing
          ? {
              ...existing,
              checked: { ...existing.checked, [item]: !existing.checked[item] },
              updatedAt,
            }
          : {
              id: generateUuidV4(),
              estateId,
              stayId,
              guestId,
              checked: { [item]: true },
              updatedAt,
            };
        set({
          completions: existing
            ? previous.map((c) => (c.stayId === stayId ? next : c))
            : [...previous, next],
        });

        const userId = useAuthStore.getState().currentUser?.id;
        if (!userId) {
          set((s) => ({
            localOnlyCompletionIds: dedupeStrings([...s.localOnlyCompletionIds, next.id]),
          }));
          return { error: null };
        }

        const { error } = await supabase
          .from('estate_handover_completions')
          .upsert(completionToDb(next), { onConflict: 'stay_id' });
        if (error) {
          if (isTransportError(error)) {
            set((s) => ({
              localOnlyCompletionIds: dedupeStrings([...s.localOnlyCompletionIds, next.id]),
            }));
            return { error: null };
          }
          set({ completions: previous });
          return { error: error.message };
        }
        set((s) => ({
          localOnlyCompletionIds: s.localOnlyCompletionIds.filter((x) => x !== next.id),
        }));
        return { error: null };
      },
    }),
    {
      name: 'maison-handover',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // v0 kept templates and completions on-device only; queue them all for upload.
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<HandoverState>;
        if (version === 0) {
          return {
            ...state,
            localOnlyTemplateEstateIds: (state.templates ?? []).map((t) => t.estateId),
            localOnlyCompletionIds: (state.completions ?? []).map((c) => c.id),
          } as HandoverState;
        }
        return state as HandoverState;
      },
    }
  )
);

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

type SetState = (
  partial:
    | Partial<HandoverState>
    | ((state: HandoverState) => Partial<HandoverState>)
) => void;

/** Best-effort upload of anything written while signed out or offline. */
async function pushLocalOnlyRows(set: SetState, get: () => HandoverState): Promise<void> {
  const userId = useAuthStore.getState().currentUser?.id;
  if (!userId) return;

  const pendingTemplates = get().templates.filter((t) =>
    get().localOnlyTemplateEstateIds.includes(t.estateId)
  );
  for (const t of pendingTemplates) {
    const { error } = await supabase.from('estate_handover_templates').upsert(
      {
        estate_id: t.estateId,
        items: t.items,
        updated_by: userId,
        updated_at: t.updatedAt ?? new Date().toISOString(),
      },
      { onConflict: 'estate_id' }
    );
    if (!error) {
      set((s) => ({
        localOnlyTemplateEstateIds: s.localOnlyTemplateEstateIds.filter(
          (x) => x !== t.estateId
        ),
      }));
    }
  }

  const pendingCompletions = get().completions.filter((c) =>
    get().localOnlyCompletionIds.includes(c.id)
  );
  for (const c of pendingCompletions) {
    const { error } = await supabase
      .from('estate_handover_completions')
      .upsert(completionToDb(c), { onConflict: 'stay_id' });
    if (!error) {
      set((s) => ({
        localOnlyCompletionIds: s.localOnlyCompletionIds.filter((x) => x !== c.id),
      }));
    }
  }
}
