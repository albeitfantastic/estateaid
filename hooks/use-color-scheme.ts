import { useAuthStore } from '@/store/auth-store';

/**
 * Returns the active color scheme driven by the user's in-app preference.
 * Selects each field separately to avoid returning a new object reference
 * on every render (which would cause useSyncExternalStore to loop infinitely).
 */
export function useColorScheme(): 'light' | 'dark' {
  const themePreference = useAuthStore((s) => s.themePreference);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  if (!isHydrated) return 'light';
  return themePreference;
}
