import type { EstateInviteRole } from '@/types';

export const APP_WEB_HOST = 'maison.app';
export const APP_STORE_URL = 'https://apps.apple.com/app/maison';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.maison.app';

/** HTTPS universal-link invite (primary share URL). */
export function inviteHttpsLink(code: string): string {
  return `https://${APP_WEB_HOST}/i/${encodeURIComponent(code.trim().toUpperCase())}`;
}

/** App-scheme fallback. Prefer {@link inviteHttpsLink} in share text. */
export function inviteDeepLink(code: string): string {
  return inviteHttpsLink(code);
}

/** Default English suffix for open (non-email-bound) invites; override via i18n in UI when building messages. */
export const DEFAULT_OPEN_INVITE_SUFFIX =
  'Each code is single-use. Open the link on your phone, or sign in to Maison and redeem the code from Properties → Join with a code.';


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

function roleLabel(role?: EstateInviteRole | string): string {
  if (role === 'coOwner' || role === 'owner') return 'Host';
  return 'Guest';
}

function formatPersonalNoteSection(note?: string): string {
  const trimmed = note?.trim();
  if (!trimmed) return '';
  return `\n\nPersonal note:\n"${trimmed}"`;
}

function formatInviteLines(items: InviteMessageLine[]): string {
  return items
    .map(
      (i) =>
        `• ${i.estateName} (${roleLabel(i.role)})\n` +
        `One-time code: ${i.inviteCode}\n` +
        `Invite link: ${inviteHttpsLink(i.inviteCode)}`
    )
    .join('\n\n');
}

/** Compact lines for messengers: note + code + single link on separate lines; no App Store URLs. */
function formatMessengerInviteLines(items: InviteMessageLine[]): string {
  return items
    .map(
      (i) =>
        `• ${i.estateName} (${roleLabel(i.role)})\n\n` +
        `One-time code:\n${i.inviteCode}\n\n` +
        `Invite link:\n${inviteHttpsLink(i.inviteCode)}`
    )
    .join('\n\n');
}

/**
 * Short share body for WhatsApp, SMS, Telegram, and system share.
 * Omits App Store links so wa.me / sms: URLs stay under platform length limits.
 */
export function buildMessengerInviteShareMessage(
  items: InviteMessageLine[],
  opts?: MultiInviteMessageOpts
): string {
  if (items.length === 0) return '';
  const noteSection = formatPersonalNoteSection(opts?.note);
  const lines = formatMessengerInviteLines(items);
  const footer =
    opts?.inviteeEmail?.trim() ? '' : `\n\n${opts?.openInviteSuffix ?? DEFAULT_OPEN_INVITE_SUFFIX}`;
  return `You're invited to Maison!${noteSection}\n\n${lines}${footer}${inviteEmailLine(opts?.inviteeEmail)}`;
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
  const noteSection = formatPersonalNoteSection(opts?.note);
  const lines = formatInviteLines(items);
  const footer =
    opts?.inviteeEmail?.trim() ? '' : `\n\n${opts?.openInviteSuffix ?? DEFAULT_OPEN_INVITE_SUFFIX}`;
  const store =
    `\n\nDownload Maison:\n` + `iOS: ${APP_STORE_URL}\n` + `Android: ${PLAY_STORE_URL}`;
  return (
    `You're invited to Maison!${noteSection}\n\n${lines}${store}\n\n` +
    `Redeem your code after signing in.` +
    footer +
    inviteEmailLine(opts?.inviteeEmail)
  );
}

/** WhatsApp / SMS: compact body (one HTTPS URL) to avoid wa.me / Linking URL truncation. */
export function buildWhatsAppMultiInviteMessage(
  items: InviteMessageLine[],
  opts?: MultiInviteMessageOpts
): string {
  return buildMessengerInviteShareMessage(items, opts);
}

/**
 * WhatsApp: lead with HTTPS invite link; include invite code for guests who already have the app.
 */
export function buildWhatsAppInviteMessage(opts: {
  estateName: string;
  inviteCode: string;
  role?: EstateInviteRole;
  note?: string;
  inviteeEmail?: string;
}): string {
  const { estateName, inviteCode, role, note, inviteeEmail } = opts;
  const noteSection = formatPersonalNoteSection(note);
  const roleSection = role ? ` as ${roleLabel(role)}` : '';
  return (
    `You're invited to ${estateName} on Maison${roleSection}!${noteSection}\n\n` +
    `One-time code: ${inviteCode}\n` +
    `Invite link: ${inviteHttpsLink(inviteCode)}` +
    inviteEmailLine(inviteeEmail)
  );
}

/** Telegram / system share: HTTPS link plus store links and code. */
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
  const noteSection = formatPersonalNoteSection(note);
  const roleSection = role ? ` as ${roleLabel(role)}` : '';
  const footer =
    footerLine ??
    (role === 'guest' || role === undefined
      ? 'Open the link on your phone, or enter your code after signing up.'
      : 'Open the link on your phone, or enter your code after signing up. Host invites work the same way.');
  const openSuffix =
    openInvite && !inviteeEmail?.trim()
      ? `\n\n${openInviteSuffix ?? DEFAULT_OPEN_INVITE_SUFFIX}`
      : '';
  return (
    `You're invited to ${estateName} on Maison${roleSection}!${noteSection}\n\n` +
    `One-time code: ${inviteCode}\n` +
    `Invite link: ${inviteHttpsLink(inviteCode)}\n\n` +
    `Download the app:\n` +
    `iOS: ${APP_STORE_URL}\n` +
    `Android: ${PLAY_STORE_URL}\n\n` +
    `${footer}` +
    openSuffix +
    inviteEmailLine(inviteeEmail)
  );
}

/** Full Telegram share text: note + code + link in message (not link-only t.me preview). */
export function buildTelegramInviteShareMessage(
  items: InviteMessageLine[],
  opts?: MultiInviteMessageOpts
): string {
  return buildMessengerInviteShareMessage(items, opts);
}

export function inviteEmailSubject(estateNames: string[]): string {
  if (estateNames.length === 1) return `Invitation to ${estateNames[0]} — Maison`;
  return `Invitation to Maison (${estateNames.length} properties)`;
}
