import { create } from 'zustand';

import { supabase } from '@/lib/supabase';

export type ProfileRow = { id: string; name: string; pushToken?: string };

/** Resolve a label for a user id: live profile → email hint → short id. */
export function resolveUserDisplayName(
  userId: string | undefined | null,
  profilesById: Record<string, ProfileRow>,
  emailHint?: string | null
): string {
  if (!userId) return 'Unknown';
  const n = profilesById[userId]?.name?.trim();
  if (n) return n;
  const email = emailHint?.trim();
  if (email) return email;
  return `User ${userId.slice(0, 8)}`;
}

interface ProfileState {
  byId: Record<string, ProfileRow>;
  setProfiles: (rows: ProfileRow[]) => void;
  fetchFromSupabase: () => Promise<void>;
  displayNameForUserId: (userId: string, emailHint?: string | null) => string;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  byId: {},
  setProfiles: (rows) => {
    const byId: Record<string, ProfileRow> = {};
    for (const r of rows) {
      byId[r.id] = { id: r.id, name: r.name ?? '', pushToken: r.pushToken };
    }
    set({ byId });
  },
  fetchFromSupabase: async () => {
    const { data, error } = await supabase.from('profiles').select('id, name, push_token');
    if (error || data == null) return;
    const rows: ProfileRow[] = data.map((row) => ({
      id: row.id as string,
      name: (row.name as string) ?? '',
      pushToken: (row.push_token as string | null) ?? undefined,
    }));
    get().setProfiles(rows);
  },
  displayNameForUserId: (userId, emailHint) =>
    resolveUserDisplayName(userId, get().byId, emailHint),
}));

/** Subscribes to profile cache; use optional email when profile row is missing (e.g. invitation). */
export function useDisplayName(userId: string | undefined | null, emailHint?: string | null): string {
  const byId = useProfileStore((s) => s.byId);
  return resolveUserDisplayName(userId, byId, emailHint);
}
