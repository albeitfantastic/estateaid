export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// Unambiguous uppercase alphanumeric chars (no 0/O, 1/I/L)
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateInviteCode(): string {
  return Array.from(
    { length: 8 },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join('');
}
