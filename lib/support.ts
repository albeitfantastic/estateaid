/** Support contact for Help, delete account requests, subscription issues. */
export const SUPPORT_EMAIL = 'support@estateaid.app';

export function supportMailto(subject: string, body?: string): string {
  const q = new URLSearchParams({ subject });
  if (body) q.set('body', body);
  return `mailto:${SUPPORT_EMAIL}?${q.toString()}`;
}
