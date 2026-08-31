import { Linking, Platform, Share } from 'react-native';

export type InviteShareChannel = 'whatsapp' | 'sms' | 'telegram';

/** Conservative iOS limit for Linking.openURL query strings. */
const IOS_URL_SAFE_LEN = 1800;

function debugShareLog(
  hypothesisId: string,
  message: string,
  data: Record<string, string | number | boolean | null | undefined>
) {
  // #region agent log
  fetch('http://127.0.0.1:7410/ingest/3b21f73e-4d1e-45e8-beb0-f14c26a6554d', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '1393f3' },
    body: JSON.stringify({
      sessionId: '1393f3',
      hypothesisId,
      location: 'invite-share-channels.ts',
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

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

  debugShareLog('A', 'openInviteShareChannel', {
    channel,
    urlLength: url.length,
    urlTooLong,
    platform: Platform.OS,
  });

  if (!urlTooLong) {
    try {
      const canOpen = await Linking.canOpenURL(schemeProbe(channel));
      debugShareLog('B', 'canOpenURL result', { channel, canOpen });

      if (canOpen) {
        await Linking.openURL(url);
        debugShareLog('C', 'opened deep link', { channel });
        return 'deep_link';
      }
    } catch (err) {
      debugShareLog('D', 'deep link failed', {
        channel,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  } else {
    debugShareLog('E', 'skipped deep link — URL too long', { channel, urlLength: url.length });
  }

  await Share.share({ message, title: shareTitle });
  debugShareLog('F', 'fallback share sheet', { channel });
  return 'share_sheet';
}
