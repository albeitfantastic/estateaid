import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StayRequest, Stay } from '@/types';
import { datesOverlap } from '@/lib/date-utils';
import { calendarBlockingRangesFromRules, rangeOverlapsRuleBlocking } from '@/lib/availability-rule-blocking';
import { useAvailabilityRuleStore } from '@/store/availability-rule-store';
import { generateUuidV4 } from '@/lib/id';
import { supabase } from '@/lib/supabase';
import { dedupeById } from '@/lib/dedup-by-id';
import { useAuthStore } from '@/store/auth-store';
import { useActivityLogStore } from '@/store/activity-log-store';
import { useEstateStore } from '@/store/estate-store';
import { getPushToken, sendCategorizedPush } from '@/lib/notifications';

function requestFromDb(row: Record<string, unknown>): StayRequest {
  return {
    id: row.id as string,
    estateId: row.estate_id as string,
    guestId: row.guest_id as string,
    requestedFrom: row.requested_from as string,
    requestedTo: row.requested_to as string,
    status: row.status as StayRequest['status'],
    guestNote: row.guest_note as string | undefined,
    ownerNote: row.owner_note as string | undefined,
    alternativeFrom: row.alternative_from as string | undefined,
    alternativeTo: row.alternative_to as string | undefined,
    createdAt: (row.created_at ?? '') as string,
    updatedAt: (row.updated_at ?? '') as string,
  };
}

function requestToDb(r: StayRequest) {
  return {
    id: r.id,
    estate_id: r.estateId,
    guest_id: r.guestId,
    requested_from: r.requestedFrom,
    requested_to: r.requestedTo,
    status: r.status,
    guest_note: r.guestNote ?? null,
    owner_note: r.ownerNote ?? null,
    alternative_from: r.alternativeFrom ?? null,
    alternative_to: r.alternativeTo ?? null,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

function stayFromDb(row: Record<string, unknown>): Stay {
  const from =
    (row.from as string | undefined) ??
    (row.stay_from as string | undefined) ??
    (row.check_in as string | undefined) ??
    (row.date_from as string | undefined) ??
    '';
  const to =
    (row.to as string | undefined) ??
    (row.stay_to as string | undefined) ??
    (row.check_out as string | undefined) ??
    (row.date_to as string | undefined) ??
    '';
  return {
    id: row.id as string,
    stayRequestId: (row.stay_request_id ?? '') as string,
    estateId: row.estate_id as string,
    guestId: row.guest_id as string,
    from,
    to,
  };
}

function stayToDb(s: Stay) {
  return {
    id: s.id,
    stay_request_id: s.stayRequestId || null,
    estate_id: s.estateId,
    guest_id: s.guestId,
    from: s.from,
    to: s.to,
  };
}

interface StayState {
  stayRequests: StayRequest[];
  stays: Stay[];
  setStayRequests: (requests: StayRequest[]) => void;
  setStays: (stays: Stay[]) => void;
  fetchFromSupabase: () => Promise<void>;
  hasConflict: (estateId: string, from: string, to: string, excludeRequestId?: string) => boolean;
  getBlockedRanges: (estateId: string) => { from: string; to: string }[];
  requestStay: (request: StayRequest) => Promise<{ error: string | null }>;
  approveStay: (requestId: string, ownerNote?: string) => { success: boolean; reason?: string };
  declineStay: (requestId: string, ownerNote?: string) => void;
  proposeAlternative: (requestId: string, from: string, to: string, ownerNote?: string) => void;
  askQuestion: (requestId: string, ownerNote: string) => void;
  cancelRequest: (requestId: string) => void;
  updateRequest: (id: string, from: string, to: string) => void;
  acceptAlternative: (requestId: string) => { success: boolean; reason?: string };
  declineAlternative: (requestId: string) => void;
  createDirectStay: (stay: Stay) => Promise<{ error: string | null }>;
  updateStayDates: (id: string, from: string, to: string) => void;
  deleteStay: (id: string) => void;
  getRequestsByEstate: (estateId: string) => StayRequest[];
  getRequestsByGuest: (guestId: string) => StayRequest[];
  getPendingRequestsCount: (ownerEstateIds: string[]) => number;
}

export const useStayStore = create<StayState>()(
  persist(
    (set, get) => ({
      stayRequests: [],
      stays: [],
      setStayRequests: (stayRequests) => set({ stayRequests }),
      setStays: (stays) => set({ stays }),

      fetchFromSupabase: async () => {
        const [reqRes, stayRes] = await Promise.all([
          supabase.from('stay_requests').select('*'),
          supabase.from('stays').select('*'),
        ]);
        if (!reqRes.error && reqRes.data != null) {
          set({ stayRequests: dedupeById(reqRes.data).map(requestFromDb) });
        }
        if (!stayRes.error && stayRes.data != null) {
          set({ stays: dedupeById(stayRes.data).map(stayFromDb) });
        }
      },

      hasConflict: (estateId, from, to, excludeRequestId) => {
        const stayHit = get().stays.some(
          (s) =>
            s.estateId === estateId &&
            (excludeRequestId ? s.stayRequestId !== excludeRequestId : true) &&
            datesOverlap(from, to, s.from, s.to)
        );
        if (stayHit) return true;
        const rules = useAvailabilityRuleStore.getState().rules;
        return rangeOverlapsRuleBlocking(rules, estateId, from, to);
      },

      getBlockedRanges: (estateId) => {
        const stayRanges = get()
          .stays.filter((s) => s.estateId === estateId)
          .map(({ from, to }) => ({ from, to }));
        const rules = useAvailabilityRuleStore.getState().rules;
        const ruleRanges = calendarBlockingRangesFromRules(rules, estateId);
        return [...stayRanges, ...ruleRanges];
      },

      requestStay: async (request) => {
        set((s) => ({ stayRequests: [...s.stayRequests, request] }));
        const { error } = await supabase.from('stay_requests').insert(requestToDb(request));
        if (error) {
          set((s) => ({ stayRequests: s.stayRequests.filter((r) => r.id !== request.id) }));
          return { error: error.message };
        }
        const estate = useEstateStore.getState().getEstateById(request.estateId);
        if (estate?.ownerId) {
          void getPushToken(estate.ownerId).then((token) =>
            sendCategorizedPush(
              'stay_requests',
              token,
              'New stay request',
              'A guest requested dates at your property.',
              {
                type: 'stay_request',
                estateId: request.estateId,
                requestId: request.id,
              }
            )
          );
        }
        return { error: null };
      },

      approveStay: (requestId, ownerNote) => {
        const req = get().stayRequests.find((r) => r.id === requestId);
        if (!req) return { success: false, reason: 'not_found' };
        if (get().hasConflict(req.estateId, req.requestedFrom, req.requestedTo, requestId)) {
          return { success: false, reason: 'conflict' };
        }
        const stay: Stay = {
          id: generateUuidV4(),
          stayRequestId: requestId,
          estateId: req.estateId,
          guestId: req.guestId,
          from: req.requestedFrom,
          to: req.requestedTo,
        };
        const updatedAt = new Date().toISOString();
        set((s) => ({
          stays: [...s.stays, stay],
          stayRequests: s.stayRequests.map((r) =>
            r.id === requestId ? { ...r, status: 'approved', ownerNote, updatedAt } : r
          ),
        }));
        void Promise.all([
          supabase.from('stays').insert(stayToDb(stay)),
          supabase.from('stay_requests').update({ status: 'approved', owner_note: ownerNote ?? null, updated_at: updatedAt }).eq('id', requestId),
        ]);
        const approveActorId = useAuthStore.getState().currentUser?.id;
        if (approveActorId) {
          useActivityLogStore.getState().logActivity(req.estateId, approveActorId, 'stay_request_approved');
        }
        return { success: true };
      },

      declineStay: (requestId, ownerNote) => {
        const req = get().stayRequests.find((r) => r.id === requestId);
        const updatedAt = new Date().toISOString();
        set((s) => ({
          stayRequests: s.stayRequests.map((r) =>
            r.id === requestId ? { ...r, status: 'declined', ownerNote, updatedAt } : r
          ),
        }));
        void supabase.from('stay_requests').update({ status: 'declined', owner_note: ownerNote ?? null, updated_at: updatedAt }).eq('id', requestId);
        const actorId = useAuthStore.getState().currentUser?.id;
        if (req && actorId) {
          useActivityLogStore.getState().logActivity(req.estateId, actorId, 'stay_request_declined');
        }
      },

      proposeAlternative: (requestId, from, to, ownerNote) => {
        const req = get().stayRequests.find((r) => r.id === requestId);
        const updatedAt = new Date().toISOString();
        set((s) => ({
          stayRequests: s.stayRequests.map((r) =>
            r.id === requestId
              ? { ...r, status: 'alternative_proposed', alternativeFrom: from, alternativeTo: to, ownerNote, updatedAt }
              : r
          ),
        }));
        void supabase.from('stay_requests').update({
          status: 'alternative_proposed',
          alternative_from: from,
          alternative_to: to,
          owner_note: ownerNote ?? null,
          updated_at: updatedAt,
        }).eq('id', requestId);
        const actorId = useAuthStore.getState().currentUser?.id;
        if (req && actorId) {
          useActivityLogStore.getState().logActivity(req.estateId, actorId, 'stay_request_alternative_proposed');
        }
      },

      askQuestion: (requestId, ownerNote) => {
        const updatedAt = new Date().toISOString();
        set((s) => ({
          stayRequests: s.stayRequests.map((r) =>
            r.id === requestId ? { ...r, status: 'question_asked', ownerNote, updatedAt } : r
          ),
        }));
        void supabase.from('stay_requests').update({ status: 'question_asked', owner_note: ownerNote, updated_at: updatedAt }).eq('id', requestId);
      },

      cancelRequest: (requestId) => {
        const req = get().stayRequests.find((r) => r.id === requestId);
        const updatedAt = new Date().toISOString();
        set((s) => ({
          stayRequests: s.stayRequests.map((r) =>
            r.id === requestId ? { ...r, status: 'cancelled', updatedAt } : r
          ),
        }));
        void supabase.from('stay_requests').update({ status: 'cancelled', updated_at: updatedAt }).eq('id', requestId);
        const actorId = useAuthStore.getState().currentUser?.id;
        if (req && actorId) {
          useActivityLogStore.getState().logActivity(req.estateId, actorId, 'stay_request_cancelled');
        }
      },

      updateRequest: (id, from, to) => {
        const updatedAt = new Date().toISOString();
        set((s) => ({
          stayRequests: s.stayRequests.map((r) =>
            r.id === id
              ? { ...r, requestedFrom: from, requestedTo: to, status: 'pending', alternativeFrom: undefined, alternativeTo: undefined, ownerNote: undefined, updatedAt }
              : r
          ),
        }));
        void supabase.from('stay_requests').update({
          requested_from: from,
          requested_to: to,
          status: 'pending',
          alternative_from: null,
          alternative_to: null,
          owner_note: null,
          updated_at: updatedAt,
        }).eq('id', id);
      },

      acceptAlternative: (requestId) => {
        const req = get().stayRequests.find((r) => r.id === requestId);
        if (!req || !req.alternativeFrom || !req.alternativeTo) {
          return { success: false, reason: 'no_alternative' };
        }
        if (get().hasConflict(req.estateId, req.alternativeFrom, req.alternativeTo, requestId)) {
          return { success: false, reason: 'conflict' };
        }
        const stay: Stay = {
          id: generateUuidV4(),
          stayRequestId: requestId,
          estateId: req.estateId,
          guestId: req.guestId,
          from: req.alternativeFrom,
          to: req.alternativeTo,
        };
        const updatedAt = new Date().toISOString();
        set((s) => ({
          stays: [...s.stays, stay],
          stayRequests: s.stayRequests.map((r) =>
            r.id === requestId
              ? { ...r, status: 'approved', requestedFrom: req.alternativeFrom!, requestedTo: req.alternativeTo!, updatedAt }
              : r
          ),
        }));
        void Promise.all([
          supabase.from('stays').insert(stayToDb(stay)),
          supabase.from('stay_requests').update({
            status: 'approved',
            requested_from: req.alternativeFrom,
            requested_to: req.alternativeTo,
            updated_at: updatedAt,
          }).eq('id', requestId),
        ]);
        return { success: true };
      },

      declineAlternative: (requestId) => {
        const updatedAt = new Date().toISOString();
        set((s) => ({
          stayRequests: s.stayRequests.map((r) =>
            r.id === requestId ? { ...r, status: 'declined', updatedAt } : r
          ),
        }));
        void supabase.from('stay_requests').update({ status: 'declined', updated_at: updatedAt }).eq('id', requestId);
      },

      createDirectStay: async (stay) => {
        set((s) => ({ stays: [...s.stays, stay] }));
        const { error } = await supabase.from('stays').insert(stayToDb(stay));
        if (error) {
          set((s) => ({ stays: s.stays.filter((st) => st.id !== stay.id) }));
          return { error: error.message };
        }
        return { error: null };
      },

      updateStayDates: (id, from, to) => {
        set((s) => ({
          stays: s.stays.map((st) => st.id === id ? { ...st, from, to } : st),
        }));
        void supabase.from('stays').update({ from, to }).eq('id', id);
      },

      deleteStay: (id) => {
        set((s) => ({ stays: s.stays.filter((st) => st.id !== id) }));
        void supabase.from('stays').delete().eq('id', id);
      },

      getRequestsByEstate: (estateId) =>
        get().stayRequests.filter((r) => r.estateId === estateId),

      getRequestsByGuest: (guestId) =>
        get().stayRequests.filter((r) => r.guestId === guestId),

      getPendingRequestsCount: (ownerEstateIds) =>
        get().stayRequests.filter(
          (r) => ownerEstateIds.includes(r.estateId) && r.status === 'pending'
        ).length,
    }),
    {
      name: '@estateaid/stays',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
