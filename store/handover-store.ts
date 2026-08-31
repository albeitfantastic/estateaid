import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_HANDOVER_ITEMS } from '@/lib/onboarding-starters';
import { generateUuidV4 } from '@/lib/id';

export type HandoverTemplate = {
  estateId: string;
  items: string[];
};

export type HandoverCompletion = {
  id: string;
  estateId: string;
  stayId: string;
  guestId: string;
  checked: Record<string, boolean>;
  updatedAt: string;
};

interface HandoverState {
  templates: HandoverTemplate[];
  completions: HandoverCompletion[];
  getTemplateItems: (estateId: string) => string[];
  setTemplateItems: (estateId: string, items: string[]) => void;
  getCompletion: (stayId: string) => HandoverCompletion | undefined;
  toggleItem: (args: {
    estateId: string;
    stayId: string;
    guestId: string;
    item: string;
  }) => void;
}

export const useHandoverStore = create<HandoverState>()(
  persist(
    (set, get) => ({
      templates: [],
      completions: [],
      getTemplateItems: (estateId) => {
        const t = get().templates.find((x) => x.estateId === estateId);
        return t?.items?.length ? t.items : DEFAULT_HANDOVER_ITEMS;
      },
      setTemplateItems: (estateId, items) => {
        set((s) => {
          const rest = s.templates.filter((x) => x.estateId !== estateId);
          return { templates: [...rest, { estateId, items }] };
        });
      },
      getCompletion: (stayId) => get().completions.find((c) => c.stayId === stayId),
      toggleItem: ({ estateId, stayId, guestId, item }) => {
        set((s) => {
          const existing = s.completions.find((c) => c.stayId === stayId);
          const now = new Date().toISOString();
          if (!existing) {
            return {
              completions: [
                ...s.completions,
                {
                  id: generateUuidV4(),
                  estateId,
                  stayId,
                  guestId,
                  checked: { [item]: true },
                  updatedAt: now,
                },
              ],
            };
          }
          return {
            completions: s.completions.map((c) =>
              c.stayId === stayId
                ? {
                    ...c,
                    checked: { ...c.checked, [item]: !c.checked[item] },
                    updatedAt: now,
                  }
                : c
            ),
          };
        });
      },
    }),
    {
      name: 'maison-handover',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
