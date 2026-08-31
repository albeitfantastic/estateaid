import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Estate } from '@/types';
import { supabase } from '@/lib/supabase';
import { dedupeById } from '@/lib/dedup-by-id';
import { useActivityLogStore } from '@/store/activity-log-store';

function fromDb(row: Record<string, unknown>): Estate {
  const ownerId = row.owner_id as string;
  return {
    id: row.id as string,
    ownerId,
    sponsorUserId: (row.sponsor_user_id as string | undefined) ?? ownerId,
    name: row.name as string,
    location: (row.location ?? '') as string,
    coverImageUrl: row.cover_image_url as string | undefined,
    description: row.description as string | undefined,
    timeZone: (row.time_zone ?? 'UTC') as string,
    createdAt: row.created_at as string,
  };
}

function remoteImageUrlOnly(url: string | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('https://') || url.startsWith('http://')) return url;
  return null;
}

function toDb(estate: Estate) {
  return {
    id: estate.id,
    owner_id: estate.ownerId,
    sponsor_user_id: estate.sponsorUserId,
    name: estate.name,
    location: estate.location,
    cover_image_url: remoteImageUrlOnly(estate.coverImageUrl),
    description: estate.description ?? null,
    time_zone: estate.timeZone,
    created_at: estate.createdAt,
  };
}

interface EstateState {
  estates: Estate[];
  setEstates: (estates: Estate[]) => void;
  fetchFromSupabase: () => Promise<void>;
  addEstate: (estate: Estate) => Promise<{ error: string | null; code?: string | null }>;
  updateEstate: (id: string, patch: Partial<Estate>) => Promise<void>;
  deleteEstate: (id: string) => Promise<{ error: string | null }>;
  transferSponsor: (estateId: string) => Promise<{ error: string | null; code?: string | null }>;
  getEstateById: (id: string) => Estate | undefined;
  getEstatesByOwner: (ownerId: string) => Estate[];
}

export const useEstateStore = create<EstateState>()(
  persist(
    (set, get) => ({
      estates: [],
      setEstates: (estates) => set({ estates }),
      fetchFromSupabase: async () => {
        const { data } = await supabase.from('estates').select('*');
        if (data) {
          const estates = dedupeById(data).map(fromDb);
          set({ estates });
          void import('@/store/estate-coverage-store').then(({ useEstateCoverageStore }) =>
            useEstateCoverageStore.getState().fetchCoverage(estates.map((e) => e.id))
          );
        }
      },
      addEstate: async (estate) => {
        const withSponsor: Estate = {
          ...estate,
          sponsorUserId: estate.sponsorUserId || estate.ownerId,
        };
        set((s) => ({ estates: [...s.estates, withSponsor] }));
        const { data, error } = await supabase.rpc('create_estate', {
          p_id: withSponsor.id,
          p_name: withSponsor.name,
          p_location: withSponsor.location,
          p_description: withSponsor.description ?? null,
          p_cover_image_url: remoteImageUrlOnly(withSponsor.coverImageUrl),
          p_time_zone: withSponsor.timeZone,
        });
        if (error) {
          set((s) => ({ estates: s.estates.filter((e) => e.id !== withSponsor.id) }));
          return { error: error.message, code: 'error' as const };
        }
        const result = data as { ok?: boolean; code?: string; message?: string } | null;
        if (!result?.ok) {
          set((s) => ({ estates: s.estates.filter((e) => e.id !== withSponsor.id) }));
          return {
            error: result?.message ?? result?.code ?? 'Could not create estate',
            code: (result?.code as string) ?? 'error',
          };
        }
        useActivityLogStore.getState().logActivity(withSponsor.id, withSponsor.ownerId, 'estate_created');
        void import('@/lib/use-case-profile').then(({ seedStarterFaqsIfEmpty }) =>
          seedStarterFaqsIfEmpty(withSponsor.id)
        );
        void import('@/lib/notifications').then(({ maybeRequestPushAfterMeaningfulAction }) =>
          maybeRequestPushAfterMeaningfulAction(withSponsor.ownerId)
        );
        void import('@/store/estate-coverage-store').then(({ useEstateCoverageStore }) =>
          useEstateCoverageStore.getState().fetchCoverage([withSponsor.id])
        );
        return { error: null, code: null };
      },
      transferSponsor: async (estateId) => {
        const { data, error } = await supabase.rpc('transfer_estate_sponsor', {
          p_estate_id: estateId,
        });
        if (error) return { error: error.message, code: 'error' };
        const result = data as { ok?: boolean; code?: string } | null;
        if (!result?.ok) {
          return {
            error: result?.code ?? 'transfer_failed',
            code: result?.code ?? 'error',
          };
        }
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.id) {
          set((s) => ({
            estates: s.estates.map((e) =>
              e.id === estateId ? { ...e, sponsorUserId: user.id } : e
            ),
          }));
        }
        void import('@/store/estate-coverage-store').then(({ useEstateCoverageStore }) =>
          useEstateCoverageStore.getState().fetchCoverage([estateId])
        );
        return { error: null, code: null };
      },
      updateEstate: async (id, patch) => {
        set((s) => ({
          estates: s.estates.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        }));
        const dbPatch: Record<string, unknown> = {};
        if (patch.name !== undefined) dbPatch.name = patch.name;
        if (patch.location !== undefined) dbPatch.location = patch.location;
        if (patch.coverImageUrl !== undefined) dbPatch.cover_image_url = patch.coverImageUrl;
        if (patch.description !== undefined) dbPatch.description = patch.description;
        if (patch.timeZone !== undefined) dbPatch.time_zone = patch.timeZone;
        await supabase.from('estates').update(dbPatch).eq('id', id);
        const estate = get().estates.find((e) => e.id === id);
        if (estate) {
          useActivityLogStore.getState().logActivity(id, estate.ownerId, 'estate_updated');
        }
      },
      deleteEstate: async (id) => {
        const prev = get().estates;
        if (!prev.some((e) => e.id === id)) return { error: 'not_found' };
        set((s) => ({ estates: s.estates.filter((e) => e.id !== id) }));
        const { error } = await supabase.from('estates').delete().eq('id', id);
        if (error) {
          set({ estates: prev });
          return { error: error.message };
        }
        return { error: null };
      },
      getEstateById: (id) => get().estates.find((e) => e.id === id),
      getEstatesByOwner: (ownerId) =>
        get().estates.filter((e) => e.ownerId === ownerId),
    }),
    {
      name: '@estateaid/estates',
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persisted, current) => {
        const p = persisted as { estates?: Estate[] } | undefined;
        const estates = (p?.estates ?? current.estates).map((e) => ({
          ...e,
          sponsorUserId: e.sponsorUserId || e.ownerId,
        }));
        return { ...current, ...p, estates };
      },
    }
  )
);
