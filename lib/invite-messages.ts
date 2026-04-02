import type { EstateInviteRole } from '@/types';

export const APP_STORE_URL = 'https://apps.apple.com/app/estateaid';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.estateaid';

/** Default English suffix for open (non-email-bound) invites; override via i18n in UI when building messages. */
export const DEFAULT_OPEN_INVITE_SUFFIX =
  'Each code is single-use. Sign in to EstateAid and redeem it from the Invitations tab (or when prompted).';

function inviteEmailLine(inviteeEmail?: string): string {
  const e = inviteeEmail?.trim();
  if (!e) return '';
  return `\n\nThis code only works when signed in as ${e}.`;
}

export type InviteMessageLine = {
  estateName: string;
  inviteCode: string;
  role?: EstateInviteRole;
};

function roleLabel(role?: EstateInviteRole): string {
  if (role === 'owner') return 'Co-owner';
  return 'Guest on property';
}

function formatInviteLines(items: InviteMessageLine[]): string {
  return items
    .map(
      (i) =>
        `• ${i.estateName} — code ${i.inviteCode} (${roleLabel(i.role)})`
    )
    .join('\n');
}

export type MultiInviteMessageOpts = {
  note?: string;
  /** If set, appends locked-invite email line */
  inviteeEmail?: string;
  /** Shown for open invites; defaults to DEFAULT_OPEN_INVITE_SUFFIX */
  openInviteSuffix?: string;
};

/**
 * Full share body for email, SMS, system share, etc. Includes store links.
 * Open invites: pass no inviteeEmail and optional openInviteSuffix (e.g. from i18n).
 */
export function buildMultiInviteShareMessage(
  items: InviteMessageLine[],
  opts?: MultiInviteMessageOpts
): string {
  if (items.length === 0) return '';
  const noteSection = opts?.note?.trim() ? `\n\n"${opts.note.trim()}"` : '';
  const lines = formatInviteLines(items);
  const footer =
    opts?.inviteeEmail?.trim() ? '' : `\n\n${opts?.openInviteSuffix ?? DEFAULT_OPEN_INVITE_SUFFIX}`;
  const store =
    `\n\nDownload EstateAid:\n` + `iOS: ${APP_STORE_URL}\n` + `Android: ${PLAY_STORE_URL}`;
  return (
    `You're invited to EstateAid!${noteSection}\n\n${lines}${store}\n\n` +
    `Redeem your code after signing in.` +
    footer +
    inviteEmailLine(opts?.inviteeEmail)
  );
}

/** WhatsApp: lead with App Store URL (existing pattern). */
export function buildWhatsAppMultiInviteMessage(
  items: InviteMessageLine[],
  opts?: MultiInviteMessageOpts
): string {
  const body = buildMultiInviteShareMessage(items, opts);
  return `${APP_STORE_URL}\n\n${body}`;
}

/**
 * WhatsApp: lead with App Store URL; include invite code for guests who already have the app.
 */
export function buildWhatsAppInviteMessage(opts: {
  estateName: string;
  inviteCode: string;
  role?: EstateInviteRole;
  note?: string;
  inviteeEmail?: string;
}): string {
  const { estateName, inviteCode, role, note, inviteeEmail } = opts;
  const noteSection = note ? `\n\n"${note}"` : '';
  const roleSection = role ? ` as ${roleLabel(role)}` : '';
  return (
    `${APP_STORE_URL}\n\n` +
    `Already have EstateAid? Your invite code: ${inviteCode}\n\n` +
    `You're invited to ${estateName} on EstateAid${roleSection}.${noteSection}` +
    inviteEmailLine(inviteeEmail)
  );
}

/** Telegram / system share: both store links plus code. */
export function buildFullInviteMessage(opts: {
  estateName: string;
  inviteCode: string;
  role?: EstateInviteRole;
  note?: string;
  footerLine?: string;
  inviteeEmail?: string;
  /** When true, append open-invite suffix instead of only footerLine */
  openInvite?: boolean;
  openInviteSuffix?: string;
}): string {
  const { estateName, inviteCode, role, note, footerLine, inviteeEmail, openInvite, openInviteSuffix } = opts;
  const noteSection = note ? `\n\n"${note}"` : '';
  const roleSection = role ? ` as ${roleLabel(role)}` : '';
  const footer =
    footerLine ??
    (role === 'guest' || role === undefined
      ? 'Enter your code after signing up. Redeem your invite from the Invitations tab.'
      : 'Enter your code after signing up. Co-owner invites work the same way.');
  const openSuffix =
    openInvite && !inviteeEmail?.trim()
      ? `\n\n${openInviteSuffix ?? DEFAULT_OPEN_INVITE_SUFFIX}`
      : '';
  return (
    `🏡 You're invited to ${estateName} on EstateAid${roleSection}!${noteSection}\n\n` +
    `Your invite code: ${inviteCode}\n\n` +
    `Download the app:\n` +
    `iOS: ${APP_STORE_URL}\n` +
    `Android: ${PLAY_STORE_URL}\n\n` +
    `${footer}` +
    openSuffix +
    inviteEmailLine(inviteeEmail)
  );
}

export function inviteEmailSubject(estateNames: string[]): string {
  if (estateNames.length === 1) return `Invitation to ${estateNames[0]} — EstateAid`;
  return `Invitation to EstateAid (${estateNames.length} properties)`;
}
