import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Invitation, InvitationStatus, InvitationRole } from '@/types';

interface InvitationState {
  invitations: Invitation[];
  setInvitations: (invitations: Invitation[]) => void;
  sendInvitation: (invitation: Invitation) => void;
  respondToInvitation: (id: string, status: 'accepted' | 'declined', guestId?: string) => void;
  revokeInvitation: (id: string) => void;
  updateInvitationRole: (id: string, role: InvitationRole) => void;
  redeemCode: (code: string, guestId: string) => { success: boolean; invitation?: Invitation; reason?: string };
  getInvitationsByEstate: (estateId: string) => Invitation[];
  getPendingInvitationsForGuest: (guestId: string, guestEmail?: string) => Invitation[];
  getAcceptedEstatesForGuest: (guestId: string, guestEmail?: string) => string[];
}

export const useInvitationStore = create<InvitationState>()(
  persist(
    (set, get) => ({
      invitations: [],
      setInvitations: (invitations) => set({ invitations }),
      sendInvitation: (invitation) =>
        set((s) => ({ invitations: [...s.invitations, invitation] })),
      respondToInvitation: (id, status, guestId) =>
        set((s) => ({
          invitations: s.invitations.map((inv) =>
            inv.id === id
              ? { ...inv, status, guestId: guestId ?? inv.guestId, respondedAt: new Date().toISOString() }
              : inv
          ),
        })),
      revokeInvitation: (id) =>
        set((s) => ({
          invitations: s.invitations.map((inv) =>
            inv.id === id ? { ...inv, status: 'revoked' as InvitationStatus } : inv
          ),
        })),
      updateInvitationRole: (id, role) =>
        set((s) => ({
          invitations: s.invitations.map((inv) =>
            inv.id === id ? { ...inv, role } : inv
          ),
        })),
      redeemCode: (code, guestId) => {
        const inv = get().invitations.find(
          (i) => i.inviteCode === code.toUpperCase().trim() && i.status === 'pending'
        );
        if (!inv) return { success: false, reason: 'invalid_or_used' };
        set((s) => ({
          invitations: s.invitations.map((i) =>
            i.id === inv.id
              ? { ...i, status: 'accepted' as InvitationStatus, guestId, respondedAt: new Date().toISOString() }
              : i
          ),
        }));
        return { success: true, invitation: { ...inv, status: 'accepted', guestId } };
      },
      getInvitationsByEstate: (estateId) =>
        get().invitations.filter((inv) => inv.estateId === estateId),
      getPendingInvitationsForGuest: (guestId, guestEmail) =>
        get().invitations.filter(
          (inv) =>
            ((guestEmail && inv.guestEmail === guestEmail) || inv.guestId === guestId) &&
            inv.status === 'pending'
        ),
      getAcceptedEstatesForGuest: (guestId, guestEmail) =>
        get()
          .invitations.filter(
            (inv) =>
              ((guestEmail && inv.guestEmail === guestEmail) || inv.guestId === guestId) &&
              inv.status === 'accepted'
          )
          .map((inv) => inv.estateId),
    }),
    {
      name: '@estateaid/invitations',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
