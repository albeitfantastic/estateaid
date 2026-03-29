import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import { SEED_USERS } from '@/store/seed-data';

export type ProfileRow = { id: string; name: string; email?: string };

/** Resolve a label for a user id: live profile → seed demo user → email hint → profile email → short id. */
export function resolveUserDisplayName(
  userId: string | undefined | null,
  profilesById: Record<string, ProfileRow>,
  emailHint?: string | null
): string {
  if (!userId) return 'Unknown';
  const profile = profilesById[userId];
  const n = profile?.name?.trim();
  if (n) return n;
  const seed = SEED_USERS.find((u) => u.id === userId);
  if (seed) return seed.name;
  const email = emailHint?.trim() || profile?.email?.trim();
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
      byId[r.id] = { id: r.id, name: r.name ?? '', email: r.email };
    }
    set({ byId });
  },
  fetchFromSupabase: async () => {
    const { data, error } = await supabase.from('profiles').select('id, name, email');
    if (error || data == null) return;
    const rows: ProfileRow[] = data.map((row) => ({
      id: row.id as string,
      name: (row.name as string) ?? '',
      email: (row.email as string) ?? undefined,
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
