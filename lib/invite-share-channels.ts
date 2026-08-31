import { Linking, Platform, Share } from 'react-native';

export type InviteShareChannel = 'whatsapp' | 'sms' | 'telegram';

/** Conservative iOS limit for Linking.openURL query strings. */
const IOS_URL_SAFE_LEN = 1800;

export function buildWhatsAppShareUrl(text: string): string {
  return `whatsapp://send?text=${encodeURIComponent(text)}`;
}

export function buildSmsShareUrl(text: string): string {
  const body = encodeURIComponent(text);
  return Platform.OS === 'ios' ? `sms:&body=${body}` : `sms:?body=${body}`;
}

export function buildTelegramShareUrl(text: string): string {
  return `tg://msg?text=${encodeURIComponent(text)}`;
}

function schemeProbe(channel: InviteShareChannel): string {
  if (channel === 'whatsapp') return 'whatsapp://send';
  if (channel === 'telegram') return 'tg://msg';
  return 'sms:';
}

function buildShareUrl(channel: InviteShareChannel, text: string): string {
  switch (channel) {
    case 'whatsapp':
      return buildWhatsAppShareUrl(text);
    case 'sms':
      return buildSmsShareUrl(text);
    case 'telegram':
      return buildTelegramShareUrl(text);
  }
}

/**
 * Open the target messenger directly when installed; fall back to system share sheet.
 */
export async function openInviteShareChannel(
  channel: InviteShareChannel,
  message: string,
  shareTitle: string
): Promise<'deep_link' | 'share_sheet'> {
  const url = buildShareUrl(channel, message);
  const urlTooLong = Platform.OS === 'ios' && url.length > IOS_URL_SAFE_LEN;

  if (!urlTooLong) {
    try {
      const canOpen = await Linking.canOpenURL(schemeProbe(channel));
      if (canOpen) {
        await Linking.openURL(url);
        return 'deep_link';
      }
    } catch {
      // fall through to share sheet
    }
  }

  await Share.share({ message, title: shareTitle });
  return 'share_sheet';
}
