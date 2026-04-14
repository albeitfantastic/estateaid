import { useColorScheme } from '@/hooks/use-color-scheme';
import { theme } from './index';

export function useAppTheme() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? theme.dark : theme.light;
}
