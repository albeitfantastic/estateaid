import type { InvitationRole } from '@/types';

export const APP_STORE_URL = 'https://apps.apple.com/app/estateaid';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.estateaid';

/**
 * WhatsApp: lead with App Store URL; include invite code for guests who already have the app.
 */
export function buildWhatsAppInviteMessage(opts: {
  estateName: string;
  inviteCode: string;
  role?: InvitationRole;
  note?: string;
}): string {
  const { estateName, inviteCode, role, note } = opts;
  const noteSection = note ? `\n\n"${note}"` : '';
  const roleSection = role ? ` as ${role}` : '';
  return (
    `${APP_STORE_URL}\n\n` +
    `Already have EstateAid? Your invite code: ${inviteCode}\n\n` +
    `You're invited to ${estateName} on EstateAid${roleSection}.${noteSection}`
  );
}

/** Telegram / system share: both store links plus code. */
export function buildFullInviteMessage(opts: {
  estateName: string;
  inviteCode: string;
  role?: InvitationRole;
  note?: string;
  footerLine?: string;
}): string {
  const { estateName, inviteCode, role, note, footerLine } = opts;
  const noteSection = note ? `\n\n"${note}"` : '';
  const roleSection = role ? ` as ${role}` : '';
  const footer =
    footerLine ??
    (role === 'guest' || role === undefined
      ? 'Enter your code after signing up as a Guest.'
      : 'Enter your code after signing up.');
  return (
    `🏡 You're invited to ${estateName} on EstateAid${roleSection}!${noteSection}\n\n` +
    `Your invite code: ${inviteCode}\n\n` +
    `Download the app:\n` +
    `iOS: ${APP_STORE_URL}\n` +
    `Android: ${PLAY_STORE_URL}\n\n` +
    `${footer}`
  );
}
