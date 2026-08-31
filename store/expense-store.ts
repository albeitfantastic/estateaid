import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { dedupeById } from '@/lib/dedup-by-id';
import { generateUuidV4 } from '@/lib/id';
import { supabase } from '@/lib/supabase';
import { isTransportError } from '@/lib/supabase-write-error';
import { useAuthStore } from '@/store/auth-store';

export type ExpenseCategory = 'maintenance' | 'utilities' | 'supplies' | 'fees' | 'other';

export type EstateExpense = {
  id: string;
  estateId: string;
  date: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  note: string;
  stayId?: string;
  eventId?: string;
  createdBy?: string;
  createdAt: string;
};

const CATEGORIES: ExpenseCategory[] = ['maintenance', 'utilities', 'supplies', 'fees', 'other'];

function normalizeCategory(raw: unknown): ExpenseCategory {
  return CATEGORIES.includes(raw as ExpenseCategory) ? (raw as ExpenseCategory) : 'other';
}

/** Amounts travel as integer cents so rounding never drifts across devices. */
function toCents(amount: number): number {
  return Math.max(0, Math.round(amount * 100));
}

function fromDb(row: Record<string, unknown>): EstateExpense {
  return {
    id: row.id as string,
    estateId: row.estate_id as string,
    date: (row.expense_date ?? '') as string,
    amount: ((row.amount_cents ?? 0) as number) / 100,
    currency: (row.currency ?? 'EUR') as string,
    category: normalizeCategory(row.category),
    note: (row.note ?? '') as string,
    stayId: (row.stay_id as string | null) ?? undefined,
    eventId: (row.event_id as string | null) ?? undefined,
    createdBy: (row.created_by as string | null) ?? undefined,
    createdAt: (row.created_at ?? '') as string,
  };
}

function toDb(e: EstateExpense) {
  return {
    id: e.id,
    estate_id: e.estateId,
    created_by: e.createdBy,
    expense_date: e.date,
    amount_cents: toCents(e.amount),
    currency: e.currency,
    category: e.category,
    note: e.note || null,
    stay_id: e.stayId ?? null,
    event_id: e.eventId ?? null,
    created_at: e.createdAt,
  };
}

type ExpenseDraft = Omit<EstateExpense, 'id' | 'createdAt' | 'currency' | 'createdBy'> & {
  id?: string;
  currency?: string;
};

interface ExpenseState {
  expenses: EstateExpense[];
  /** Local rows written before this device ever reached Supabase. */
  localOnlyIds: string[];
  setExpenses: (expenses: EstateExpense[]) => void;
  fetchFromSupabase: () => Promise<void>;
  addExpense: (draft: ExpenseDraft) => Promise<{ error: string | null }>;
  deleteExpense: (id: string) => Promise<{ error: string | null }>;
  getByEstate: (estateId: string) => EstateExpense[];
  totalForEstate: (estateId: string, year?: number) => number;
}

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set, get) => ({
      expenses: [],
      localOnlyIds: [],
      setExpenses: (expenses) => set({ expenses }),

      fetchFromSupabase: async () => {
        const userId = useAuthStore.getState().currentUser?.id;
        const pending = userId
          ? get().expenses.filter((e) => get().localOnlyIds.includes(e.id))
          : [];
        if (pending.length > 0) {
          const uploaded: string[] = [];
          for (const e of pending) {
            const { error } = await supabase
              .from('estate_expenses')
              .upsert(toDb({ ...e, createdBy: e.createdBy ?? userId }), {
                onConflict: 'id',
                ignoreDuplicates: true,
              });
            if (!error) uploaded.push(e.id);
          }
          if (uploaded.length > 0) {
            set((s) => ({ localOnlyIds: s.localOnlyIds.filter((id) => !uploaded.includes(id)) }));
          }
        }

        const { data, error } = await supabase.from('estate_expenses').select('*');
        if (error) throw new Error(error.message);
        if (!data) return;
        const remote = dedupeById(data).map(fromDb);
        // Anything still awaiting upload must survive the refresh.
        const stillLocal = get().expenses.filter(
          (e) => get().localOnlyIds.includes(e.id) && !remote.some((r) => r.id === e.id)
        );
        set({ expenses: [...stillLocal, ...remote] });
      },

      addExpense: async (draft) => {
        const userId = useAuthStore.getState().currentUser?.id;
        const row: EstateExpense = {
          id: draft.id ?? generateUuidV4(),
          estateId: draft.estateId,
          date: draft.date,
          amount: draft.amount,
          currency: draft.currency ?? 'EUR',
          category: draft.category,
          note: draft.note,
          stayId: draft.stayId,
          eventId: draft.eventId,
          createdBy: userId,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ expenses: [row, ...s.expenses] }));

        if (!userId) {
          set((s) => ({ localOnlyIds: [...s.localOnlyIds, row.id] }));
          return { error: null };
        }

        const { error } = await supabase.from('estate_expenses').insert(toDb(row));
        if (error) {
          if (isTransportError(error)) {
            set((s) => ({ localOnlyIds: [...s.localOnlyIds, row.id] }));
            return { error: null };
          }
          set((s) => ({ expenses: s.expenses.filter((e) => e.id !== row.id) }));
          return { error: error.message };
        }
        return { error: null };
      },

      deleteExpense: async (id) => {
        const previous = get().expenses;
        const row = previous.find((e) => e.id === id);
        const neverSynced = get().localOnlyIds.includes(id);
        set((s) => ({
          expenses: s.expenses.filter((e) => e.id !== id),
          localOnlyIds: s.localOnlyIds.filter((x) => x !== id),
        }));
        if (!row || neverSynced) return { error: null };

        const { error } = await supabase.from('estate_expenses').delete().eq('id', id);
        if (error) {
          set({ expenses: previous });
          return { error: error.message };
        }
        return { error: null };
      },

      getByEstate: (estateId) =>
        get()
          .expenses.filter((e) => e.estateId === estateId)
          .sort((a, b) => b.date.localeCompare(a.date)),

      totalForEstate: (estateId, year) => {
        return get()
          .getByEstate(estateId)
          .filter((e) => (year == null ? true : e.date.startsWith(String(year))))
          .reduce((sum, e) => sum + e.amount, 0);
      },
    }),
    {
      name: 'maison-expenses',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // v0 kept every expense on-device only; mark them all for upload on first sync.
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<ExpenseState>;
        if (version === 0) {
          return {
            ...state,
            expenses: (state.expenses ?? []).map((e) => ({ ...e, currency: e.currency ?? 'EUR' })),
            localOnlyIds: (state.expenses ?? []).map((e) => e.id),
          } as ExpenseState;
        }
        return state as ExpenseState;
      },
    }
  )
);
