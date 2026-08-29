import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { generateUuidV4 } from '@/lib/id';

export type ExpenseCategory = 'maintenance' | 'utilities' | 'supplies' | 'fees' | 'other';

export type EstateExpense = {
  id: string;
  estateId: string;
  date: string;
  amount: number;
  category: ExpenseCategory;
  note: string;
  stayId?: string;
  eventId?: string;
  createdAt: string;
};

interface ExpenseState {
  expenses: EstateExpense[];
  addExpense: (e: Omit<EstateExpense, 'id' | 'createdAt'> & { id?: string }) => void;
  deleteExpense: (id: string) => void;
  getByEstate: (estateId: string) => EstateExpense[];
  totalForEstate: (estateId: string, year?: number) => number;
}

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set, get) => ({
      expenses: [],
      addExpense: (e) => {
        const row: EstateExpense = {
          id: e.id ?? generateUuidV4(),
          estateId: e.estateId,
          date: e.date,
          amount: e.amount,
          category: e.category,
          note: e.note,
          stayId: e.stayId,
          eventId: e.eventId,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ expenses: [row, ...s.expenses] }));
      },
      deleteExpense: (id) => set((s) => ({ expenses: s.expenses.filter((x) => x.id !== id) })),
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
    }
  )
);
