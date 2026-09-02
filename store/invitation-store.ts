import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Invitation, InvitationStatus, normalizeInviteRole, type EstateInviteRole } from '@/types';
import { supabase } from '@/lib/supabase';
import { useEstateStore } from '@/store/estate-store';
import { useActivityLogStore } from '@/store/activity-log-store';
import { dedupeById } from '@/lib/dedup-by-id';
import { normalizeGuestEmail } from '@/lib/invite-email';
import { getPushToken, maybeRequestPushAfterMeaningfulAction, sendCategorizedPush, sendPush } from '@/lib/notifications';

function fromDb(row: Record<string, unknown>): Invitation {
  return {
    id: row.id as string,
    estateId: row.estate_id as string,
    ownerId: row.owner_id as string,
    inviteCode: row.invite_code as string,
    guestEmail: row.guest_email as string | undefined,
    inviteeLabel: row.invitee_label as string | undefined,
    guestId: row.guest_id as string | undefined,
    role: normalizeInviteRole(row.role as string | undefined),
    status: row.status as InvitationStatus,
    message: row.message as string | undefined,
    calendarColor: (row.calendar_color as string | undefined) || undefined,
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
    invitee_label: inv.inviteeLabel ?? null,
    guest_id: inv.guestId ?? null,
    role: normalizeInviteRole(inv.role),
    status: inv.status,
    message: inv.message ?? null,
    calendar_color: inv.calendarColor ?? null,
    created_at: inv.createdAt,
    responded_at: inv.respondedAt ?? null,
  };
}

interface InvitationState {
  invitations: Invitation[];
  setInvitations: (invitations: Invitation[]) => void;
  fetchFromSupabase: () => Promise<void>;
  sendInvitation: (invitation: Invitation) => Promise<{ error: string | null; code?: string | null }>;
  respondToInvitation: (id: string, status: 'accepted' | 'declined', guestId?: string) => void;
  revokeInvitation: (id: string) => void;
  deleteInvitation: (id: string) => Promise<{ error: string | null }>;
  updateInvitationRole: (id: string, role: EstateInviteRole) => Promise<{ error: string | null; code?: string | null }>;
  updateGuestCalendarColor: (guestId: string, color: string, estateIds?: string[]) => Promise<{ error: string | null }>;
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
        if (error) throw new Error(error.message);
        if (data != null) {
          set({ invitations: dedupeById(data).map(fromDb) });
        }
      },
      sendInvitation: async (invitation) => {
        const normalized: Invitation = {
          ...invitation,
          role: normalizeInviteRole(invitation.role),
        };
        set((s) => ({ invitations: [...s.invitations, normalized] }));
        const { error } = await supabase.from('invitations').insert(toDb(normalized));
        if (error) {
          set((s) => ({ invitations: s.invitations.filter((i) => i.id !== normalized.id) }));
          const detail = (error as { details?: string; hint?: string; code?: string }).details
            ?? (error as { hint?: string }).hint
            ?? error.message;
          const code =
            /co_owner_cap|cap_reached/i.test(detail) || /co_owner_cap/i.test(error.message)
              ? 'co_owner_cap_reached'
              : /sponsor_lapsed|not covered|estate_host/i.test(detail)
                ? 'sponsor_lapsed'
                : /upgrade|full_product|host_write/i.test(detail)
                  ? 'upgrade_required'
                  : 'error';
          return { error: error.message, code };
        }
        useActivityLogStore
          .getState()
          .logActivity(normalized.estateId, normalized.ownerId, 'invitation_sent');
        void import('@/store/estate-coverage-store').then(({ useEstateCoverageStore }) =>
          useEstateCoverageStore.getState().fetchCoverage([normalized.estateId])
        );
        return { error: null, code: null };
      },
      respondToInvitation: (id, status, guestId) => {
        const respondedAt = new Date().toISOString();
        const inv = get().invitations.find((i) => i.id === id);
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
        const actorId = guestId ?? inv?.guestId;
        if (inv && actorId) {
          useActivityLogStore
            .getState()
            .logActivity(inv.estateId, actorId, status === 'accepted' ? 'invitation_accepted' : 'invitation_declined');
        }
        if (status === 'accepted' && inv) {
          if (actorId) void maybeRequestPushAfterMeaningfulAction(actorId);
          void sendCategorizedPush(
            'invites',
            inv.ownerId,
            'Invite accepted',
            'A guest accepted your invitation.',
            { type: 'invite_accepted', estateId: inv.estateId }
          );
        }
      },
      revokeInvitation: (id) => {
        const inv = get().invitations.find((i) => i.id === id);
        set((s) => ({
          invitations: s.invitations.map((inv) =>
            inv.id === id ? { ...inv, status: 'revoked' as InvitationStatus } : inv
          ),
        }));
        void supabase.from('invitations').update({ status: 'revoked' }).eq('id', id);
        if (inv) {
          useActivityLogStore.getState().logActivity(inv.estateId, inv.ownerId, 'invitation_revoked');
        }
      },
      deleteInvitation: async (id) => {
        const inv = get().invitations.find((i) => i.id === id);
        if (!inv) return { error: 'Invitation not found.' };
        const prev = get().invitations;
        set({ invitations: prev.filter((i) => i.id !== id) });
        const { error } = await supabase.from('invitations').delete().eq('id', id);
        if (error) {
          set({ invitations: prev });
          return { error: error.message };
        }
        void import('@/store/estate-coverage-store').then(({ useEstateCoverageStore }) =>
          useEstateCoverageStore.getState().fetchCoverage([inv.estateId])
        );
        return { error: null };
      },
      updateInvitationRole: async (id, role) => {
        const nextRole = normalizeInviteRole(role);
        const prev = get().invitations.find((i) => i.id === id);
        set((s) => ({
          invitations: s.invitations.map((inv) =>
            inv.id === id ? { ...inv, role: nextRole } : inv
          ),
        }));
        const { error } = await supabase.from('invitations').update({ role: nextRole }).eq('id', id);
        if (error) {
          if (prev) {
            set((s) => ({
              invitations: s.invitations.map((inv) => (inv.id === id ? prev : inv)),
            }));
          }
          return { error: error.message, code: 'error' };
        }
        const inv = get().invitations.find((i) => i.id === id);
        if (inv?.guestId) {
          const roleLabel = nextRole === 'owner' ? 'Host' : 'Guest';
          void getPushToken(inv.guestId).then((token) =>
            sendPush(token, 'Role Updated', `Your role has been updated to ${roleLabel}.`)
          );
        }
        if (inv) {
          void import('@/store/estate-coverage-store').then(({ useEstateCoverageStore }) =>
            useEstateCoverageStore.getState().fetchCoverage([inv.estateId])
          );
        }
        return { error: null, code: null };
      },
      updateGuestCalendarColor: async (guestId, color, estateIds) => {
        const hex = color.trim();
        if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
          return { error: 'Invalid color' };
        }
        const targets = get().invitations.filter(
          (inv) =>
            inv.guestId === guestId &&
            inv.status === 'accepted' &&
            (!estateIds || estateIds.length === 0 || estateIds.includes(inv.estateId))
        );
        if (targets.length === 0) return { error: null };
        const ids = new Set(targets.map((inv) => inv.id));
        const previous = get().invitations;
        set((s) => ({
          invitations: s.invitations.map((inv) =>
            ids.has(inv.id) ? { ...inv, calendarColor: hex } : inv
          ),
        }));
        const { error } = await supabase
          .from('invitations')
          .update({ calendar_color: hex })
          .in('id', [...ids]);
        if (error) {
          set({ invitations: previous });
          return { error: error.message };
        }
        return { error: null };
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

        if (inv?.guestEmail?.trim()) {
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
              useActivityLogStore
                .getState()
                .logActivity(invAccepted.estateId, guestId, 'invitation_accepted');
              void maybeRequestPushAfterMeaningfulAction(guestId);
              void sendCategorizedPush(
                'invites',
                invAccepted.ownerId,
                'Invite accepted',
                'A guest accepted your invitation.',
                { type: 'invite_accepted', estateId: invAccepted.estateId }
              );
              return { success: true, invitation: invAccepted };
            }
            if (p.ok === false) {
              const r = p.reason;
              if (r === 'not_authenticated') return { success: false, reason: 'fetch_error' as const };
              if (r === 'wrong_invitee') return { success: false, reason: 'wrong_invitee' as const };
              if (r === 'no_session_email') return { success: false, reason: 'no_session_email' as const };
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
          if (inv.guestEmail?.trim()) {
            if (normalizeGuestEmail(inv.guestEmail) !== sessionEmail) {
              return { success: false, reason: 'wrong_invitee' as const };
            }
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
        useActivityLogStore.getState().logActivity(inv.estateId, guestId, 'invitation_accepted');
        void maybeRequestPushAfterMeaningfulAction(guestId);
        void sendCategorizedPush(
          'invites',
          inv.ownerId,
          'Invite accepted',
          'A guest accepted your invitation.',
          { type: 'invite_accepted', estateId: inv.estateId }
        );
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
      name: '@maison/invitations',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
