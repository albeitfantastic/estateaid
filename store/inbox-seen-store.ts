import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

export type InboxSeenKind = 'task' | 'request' | 'doc' | 'contact' | 'guests' | 'estate';

export function inboxSeenKey(kind: InboxSeenKind, id: string): string {
  return `${kind}:${id}`;
}

interface InboxSeenState {
  /** ISO time the user last opened this target. Later activity is unseen again. */
  seenAt: Record<string, string>;
  markSeen: (key: string) => void;
}

export const useInboxSeenStore = create<InboxSeenState>()(
  persist(
    (set) => ({
      seenAt: {},
      markSeen: (key) => {
        if (!key) return;
        const at = new Date().toISOString();
        set((s) => ({ seenAt: { ...s.seenAt, [key]: at } }));
      },
    }),
    {
      name: '@maison/inbox-seen',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export function markInboxSeen(kind: InboxSeenKind, id: string | undefined) {
  if (!id) return;
  useInboxSeenStore.getState().markSeen(inboxSeenKey(kind, id));
}

export function isInboxUnseen(
  seenAt: Record<string, string>,
  key: string,
  latestAt: string
): boolean {
  const at = seenAt[key];
  if (!at) return true;
  return latestAt > at;
}

/** Mark a target seen while its screen is focused (covers every entry point). */
export function useMarkInboxSeenOnFocus(kind: InboxSeenKind, id: string | undefined) {
  const markSeen = useInboxSeenStore((s) => s.markSeen);
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      const key = inboxSeenKey(kind, id);
      markSeen(key);
      return () => markSeen(key);
    }, [kind, id, markSeen])
  );
}
