import AsyncStorage from '@react-native-async-storage/async-storage';

import { APP_TRIAL_DAYS } from '@/lib/subscription-config';
import { nightCount } from '@/lib/date-utils';
import { isBlockedStay } from '@/lib/setup-progress';
import { supabase } from '@/lib/supabase';
import type { Invitation, Stay } from '@/types';

const SEEN_KEY = 'maison.conversion.invite_seen';

export type ConversionKind = 'expiry' | 'invite_accepted' | 'day11';

export type ConversionInventory = {
  documents: number;
  contacts: number;
  guests: number;
  daysBlocked: number;
};

export function isDay11Window(daysRemaining: number | null): boolean {
  if (daysRemaining == null) return false;
  return daysRemaining <= APP_TRIAL_DAYS - 10;
}

export function inventoryIsEmpty(inv: ConversionInventory): boolean {
  return inv.documents + inv.contacts + inv.guests + inv.daysBlocked === 0;
}

export function daysBlockedFromStays(stays: Stay[], estateIds: string[]): number {
  return stays
    .filter((s) => estateIds.includes(s.estateId) && isBlockedStay(s))
    .reduce((sum, s) => sum + Math.max(0, nightCount(s.from, s.to)), 0);
}

export function hostHasAcceptedInvite(invitations: Invitation[], userId: string): boolean {
  return invitations.some(
    (i) => i.ownerId === userId && i.status === 'accepted'
  );
}

export async function fetchInviteConversionSeen(userId: string): Promise<boolean> {
  try {
    const local = await AsyncStorage.getItem(`${SEEN_KEY}.${userId}`);
    if (local === '1') return true;
    const { data } = await supabase
      .from('profiles')
      .select('conversion_invite_seen_at')
      .eq('id', userId)
      .maybeSingle();
    if (data?.conversion_invite_seen_at) {
      await AsyncStorage.setItem(`${SEEN_KEY}.${userId}`, '1');
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export async function markInviteConversionSeen(userId: string): Promise<void> {
  await AsyncStorage.setItem(`${SEEN_KEY}.${userId}`, '1');
  try {
    await supabase
      .from('profiles')
      .update({ conversion_invite_seen_at: new Date().toISOString() })
      .eq('id', userId);
  } catch {
    /* best-effort */
  }
}

export function pickConversionKind(opts: {
  guestOnly: boolean;
  coverageLapsed: boolean;
  inviteAcceptedOnce: boolean;
  inviteSeen: boolean;
  day11: boolean;
  inventoryEmpty: boolean;
}): ConversionKind | 'checklist' | null {
  if (opts.guestOnly) return null;
  if (opts.coverageLapsed) return 'expiry';
  if (opts.inviteAcceptedOnce && !opts.inviteSeen) return 'invite_accepted';
  if (opts.day11) return opts.inventoryEmpty ? 'checklist' : 'day11';
  return null;
}
