import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Invitation, InvitationStatus, InvitationRole } from '@/types';
import { supabase } from '@/lib/supabase';
import { useEstateStore } from '@/store/estate-store';
import { dedupeById } from '@/lib/dedup-by-id';
import { normalizeGuestEmail } from '@/lib/invite-email';
import { getPushToken, sendPush } from '@/lib/notifications';

function fromDb(row: Record<string, unknown>): Invitation {
  return {
    id: row.id as string,
    estateId: row.estate_id as string,
    ownerId: row.owner_id as string,
    inviteCode: row.invite_code as string,
    guestEmail: row.guest_email as string | undefined,
    guestId: row.guest_id as string | undefined,
    role: row.role as InvitationRole | undefined,
    status: row.status as InvitationStatus,
    message: row.message as string | undefined,
    createdAt: (row.created_at ?? '') as string,
    respondedAt: row.responded_at as string | undefined,
  };
}

function toDb(inv: Invitation) {
  return {
    id: inv.id,
    estate_id: inv.estateId,
    owner_id: inv.ownerId,
    invite_code: inv.inviteCode,
    guest_email: inv.guestEmail ?? null,
    guest_id: inv.guestId ?? null,
    role: inv.role ?? 'guest',
    status: inv.status,
    message: inv.message ?? null,
    created_at: inv.createdAt,
    responded_at: inv.respondedAt ?? null,
  };
}

interface InvitationState {
  invitations: Invitation[];
  setInvitations: (invitations: Invitation[]) => void;
  fetchFromSupabase: () => Promise<void>;
  sendInvitation: (invitation: Invitation) => Promise<{ error: string | null }>;
  respondToInvitation: (id: string, status: 'accepted' | 'declined', guestId?: string) => void;
  revokeInvitation: (id: string) => void;
  updateInvitationRole: (id: string, role: InvitationRole) => void;
  redeemCode: (
    code: string,
    guestId: string
  ) => Promise<{ success: boolean; invitation?: Invitation; reason?: string }>;
  getInvitationsByEstate: (estateId: string) => Invitation[];
  getPendingInvitationsForGuest: (guestId: string, guestEmail?: string) => Invitation[];
  getAcceptedEstatesForGuest: (guestId: string, guestEmail?: string) => string[];
}

export const useInvitationStore = create<InvitationState>()(
  persist(
    (set, get) => ({
      invitations: [],
      setInvitations: (invitations) => set({ invitations }),
      fetchFromSupabase: async () => {
        const { data, error } = await supabase.from('invitations').select('*');
        if (!error && data != null) {
          set({ invitations: dedupeById(data).map(fromDb) });
        }
      },
      sendInvitation: async (invitation) => {
        set((s) => ({ invitations: [...s.invitations, invitation] }));
        const { error } = await supabase.from('invitations').insert(toDb(invitation));
        if (error) {
          set((s) => ({ invitations: s.invitations.filter((i) => i.id !== invitation.id) }));
          return { error: error.message };
        }
        return { error: null };
      },
      respondToInvitation: (id, status, guestId) => {
        const respondedAt = new Date().toISOString();
        set((s) => ({
          invitations: s.invitations.map((inv) =>
            inv.id === id
              ? { ...inv, status, guestId: guestId ?? inv.guestId, respondedAt }
              : inv
          ),
        }));
        const update: Record<string, unknown> = { status, responded_at: respondedAt };
        if (guestId) update.guest_id = guestId;
        void supabase.from('invitations').update(update).eq('id', id);
        if (status === 'accepted') {
          void useEstateStore.getState().fetchFromSupabase();
        }
      },
      revokeInvitation: (id) => {
        set((s) => ({
          invitations: s.invitations.map((inv) =>
            inv.id === id ? { ...inv, status: 'revoked' as InvitationStatus } : inv
          ),
        }));
        void supabase.from('invitations').update({ status: 'revoked' }).eq('id', id);
      },
      updateInvitationRole: (id, role) => {
        set((s) => ({
          invitations: s.invitations.map((inv) =>
            inv.id === id ? { ...inv, role } : inv
          ),
        }));
        void supabase.from('invitations').update({ role }).eq('id', id);
        // Notify the invitee — fire-and-forget
        const inv = get().invitations.find((i) => i.id === id);
        if (inv?.guestId) {
          const roleLabel = role === 'owner' ? 'Owner' : 'Guest';
          void getPushToken(inv.guestId).then((token) =>
            sendPush(token, 'Role Updated', `Your role has been updated to ${roleLabel}.`)
          );
        }
      },
      redeemCode: async (code, guestId) => {
        const norm = code.toUpperCase().trim();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const sessionEmail = user?.email ? normalizeGuestEmail(user.email) : '';
        if (!sessionEmail) {
          return { success: false, reason: 'no_session_email' as const };
        }

        let inv =
          get().invitations.find((i) => i.inviteCode === norm && i.status === 'pending') ?? null;

        if (inv) {
          if (!inv.guestEmail?.trim()) {
            return { success: false, reason: 'invite_missing_email' as const };
          }
          if (normalizeGuestEmail(inv.guestEmail) !== sessionEmail) {
            return { success: false, reason: 'wrong_invitee' as const };
          }
        }

        if (!inv) {
          const { data: rpcResult, error: rpcError } = await supabase.rpc(
            'redeem_invitation_by_code',
            { p_code: norm }
          );

          const fnMissing =
            !!rpcError &&
            (rpcError.code === 'PGRST202' ||
              /could not find the function/i.test(rpcError.message ?? '') ||
              /function public\.redeem_invitation_by_code/i.test(rpcError.message ?? ''));

          if (!rpcError && rpcResult && typeof rpcResult === 'object' && rpcResult !== null) {
            const p = rpcResult as { ok?: boolean; reason?: string; row?: Record<string, unknown> };
            if (p.ok === true && p.row && typeof p.row === 'object') {
              const invAccepted = fromDb(p.row);
              set((s) => ({
                invitations: s.invitations.some((i) => i.id === invAccepted.id)
                  ? s.invitations.map((i) => (i.id === invAccepted.id ? invAccepted : i))
                  : [...s.invitations, invAccepted],
              }));
              void useEstateStore.getState().fetchFromSupabase();
              return { success: true, invitation: invAccepted };
            }
            if (p.ok === false) {
              const r = p.reason;
              if (r === 'not_authenticated') return { success: false, reason: 'fetch_error' as const };
              if (r === 'wrong_invitee') return { success: false, reason: 'wrong_invitee' as const };
              if (r === 'no_session_email') return { success: false, reason: 'no_session_email' as const };
              if (r === 'invite_missing_email')
                return { success: false, reason: 'invite_missing_email' as const };
              return { success: false, reason: (r as string) ?? 'invalid_or_used' };
            }
          }

          if (rpcError && !fnMissing) {
            return { success: false, reason: 'fetch_error' };
          }

          const { data, error } = await supabase
            .from('invitations')
            .select('*')
            .eq('invite_code', norm)
            .eq('status', 'pending')
            .maybeSingle();
          if (error) {
            return { success: false, reason: 'fetch_error' };
          }
          if (!data) {
            return { success: false, reason: 'invalid_or_used' };
          }
          inv = fromDb(data);
          if (!inv.guestEmail?.trim()) {
            return { success: false, reason: 'invite_missing_email' as const };
          }
          if (normalizeGuestEmail(inv.guestEmail) !== sessionEmail) {
            return { success: false, reason: 'wrong_invitee' as const };
          }
          set((s) =>
            s.invitations.some((i) => i.id === inv!.id)
              ? s
              : { invitations: [...s.invitations, inv!] }
          );
        }

        const respondedAt = new Date().toISOString();
        const { data: updated, error: upErr } = await supabase
          .from('invitations')
          .update({ status: 'accepted', guest_id: guestId, responded_at: respondedAt })
          .eq('id', inv.id)
          .eq('status', 'pending')
          .select('id')
          .maybeSingle();
        if (upErr || !updated) {
          return { success: false, reason: 'update_failed' };
        }

        set((s) => ({
          invitations: s.invitations.map((i) =>
            i.id === inv!.id
              ? { ...i, status: 'accepted' as InvitationStatus, guestId, respondedAt }
              : i
          ),
        }));
        void useEstateStore.getState().fetchFromSupabase();
        return { success: true, invitation: { ...inv!, status: 'accepted', guestId } };
      },
      getInvitationsByEstate: (estateId) =>
        get().invitations.filter((inv) => inv.estateId === estateId),
      getPendingInvitationsForGuest: (guestId, guestEmail) =>
        get().invitations.filter((inv) => {
          if (inv.status !== 'pending') return false;
          if (inv.guestId === guestId) return true;
          if (guestEmail && inv.guestEmail) {
            return normalizeGuestEmail(inv.guestEmail) === normalizeGuestEmail(guestEmail);
          }
          return false;
        }),
      getAcceptedEstatesForGuest: (guestId, guestEmail) =>
        get()
          .invitations.filter((inv) => {
            if (inv.status !== 'accepted') return false;
            if (inv.guestId === guestId) return true;
            if (guestEmail && inv.guestEmail) {
              return normalizeGuestEmail(inv.guestEmail) === normalizeGuestEmail(guestEmail);
            }
            return false;
          })
          .map((inv) => inv.estateId),
    }),
    {
      name: '@estateaid/invitations',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
