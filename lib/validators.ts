const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function isRequired(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidDateRange(from: string, to: string): boolean {
  return from <= to;
}
