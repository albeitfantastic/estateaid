import { useColorScheme } from '@/hooks/use-color-scheme';
import { theme } from './index';

export function useAppTheme() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { ...theme[scheme], scheme };
}
