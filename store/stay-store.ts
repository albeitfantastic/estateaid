import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StayRequest, Stay } from '@/types';
import { datesOverlap } from '@/lib/date-utils';
import { generateId } from '@/lib/id';

interface StayState {
  stayRequests: StayRequest[];
  stays: Stay[];
  setStayRequests: (requests: StayRequest[]) => void;
  setStays: (stays: Stay[]) => void;

  /** Returns true if the given date range conflicts with an existing approved stay */
  hasConflict: (estateId: string, from: string, to: string, excludeRequestId?: string) => boolean;

  /** Get blocked date ranges for a given estate (guest calendar — no guest names) */
  getBlockedRanges: (estateId: string) => { from: string; to: string }[];

  requestStay: (request: StayRequest) => void;
  approveStay: (requestId: string, ownerNote?: string) => { success: boolean; reason?: string };
  declineStay: (requestId: string, ownerNote?: string) => void;
  proposeAlternative: (requestId: string, from: string, to: string, ownerNote?: string) => void;
  askQuestion: (requestId: string, ownerNote: string) => void;
  cancelRequest: (requestId: string) => void;
  acceptAlternative: (requestId: string) => { success: boolean; reason?: string };
  declineAlternative: (requestId: string) => void;
  createDirectStay: (stay: Stay) => void;
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

      hasConflict: (estateId, from, to, excludeRequestId) => {
        return get().stays.some(
          (s) =>
            s.estateId === estateId &&
            (excludeRequestId ? s.stayRequestId !== excludeRequestId : true) &&
            datesOverlap(from, to, s.from, s.to)
        );
      },

      getBlockedRanges: (estateId) =>
        get()
          .stays.filter((s) => s.estateId === estateId)
          .map(({ from, to }) => ({ from, to })),

      requestStay: (request) =>
        set((s) => ({ stayRequests: [...s.stayRequests, request] })),

      approveStay: (requestId, ownerNote) => {
        const req = get().stayRequests.find((r) => r.id === requestId);
        if (!req) return { success: false, reason: 'not_found' };

        if (get().hasConflict(req.estateId, req.requestedFrom, req.requestedTo, requestId)) {
          return { success: false, reason: 'conflict' };
        }

        const stay: Stay = {
          id: generateId(),
          stayRequestId: requestId,
          estateId: req.estateId,
          guestId: req.guestId,
          from: req.requestedFrom,
          to: req.requestedTo,
        };

        set((s) => ({
          stays: [...s.stays, stay],
          stayRequests: s.stayRequests.map((r) =>
            r.id === requestId
              ? { ...r, status: 'approved', ownerNote, updatedAt: new Date().toISOString() }
              : r
          ),
        }));
        return { success: true };
      },

      declineStay: (requestId, ownerNote) =>
        set((s) => ({
          stayRequests: s.stayRequests.map((r) =>
            r.id === requestId
              ? { ...r, status: 'declined', ownerNote, updatedAt: new Date().toISOString() }
              : r
          ),
        })),

      proposeAlternative: (requestId, from, to, ownerNote) =>
        set((s) => ({
          stayRequests: s.stayRequests.map((r) =>
            r.id === requestId
              ? {
                  ...r,
                  status: 'alternative_proposed',
                  alternativeFrom: from,
                  alternativeTo: to,
                  ownerNote,
                  updatedAt: new Date().toISOString(),
                }
              : r
          ),
        })),

      askQuestion: (requestId, ownerNote) =>
        set((s) => ({
          stayRequests: s.stayRequests.map((r) =>
            r.id === requestId
              ? { ...r, status: 'question_asked', ownerNote, updatedAt: new Date().toISOString() }
              : r
          ),
        })),

      cancelRequest: (requestId) =>
        set((s) => ({
          stayRequests: s.stayRequests.map((r) =>
            r.id === requestId
              ? { ...r, status: 'cancelled', updatedAt: new Date().toISOString() }
              : r
          ),
        })),

      acceptAlternative: (requestId) => {
        const req = get().stayRequests.find((r) => r.id === requestId);
        if (!req || !req.alternativeFrom || !req.alternativeTo) {
          return { success: false, reason: 'no_alternative' };
        }
        if (get().hasConflict(req.estateId, req.alternativeFrom, req.alternativeTo, requestId)) {
          return { success: false, reason: 'conflict' };
        }

        const stay: Stay = {
          id: generateId(),
          stayRequestId: requestId,
          estateId: req.estateId,
          guestId: req.guestId,
          from: req.alternativeFrom,
          to: req.alternativeTo,
        };

        set((s) => ({
          stays: [...s.stays, stay],
          stayRequests: s.stayRequests.map((r) =>
            r.id === requestId
              ? {
                  ...r,
                  status: 'approved',
                  requestedFrom: req.alternativeFrom!,
                  requestedTo: req.alternativeTo!,
                  updatedAt: new Date().toISOString(),
                }
              : r
          ),
        }));
        return { success: true };
      },

      declineAlternative: (requestId) =>
        set((s) => ({
          stayRequests: s.stayRequests.map((r) =>
            r.id === requestId
              ? { ...r, status: 'declined', updatedAt: new Date().toISOString() }
              : r
          ),
        })),

      createDirectStay: (stay) =>
        set((s) => ({ stays: [...s.stays, stay] })),

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
