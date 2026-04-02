import type { Router } from 'expo-router';

import type { SettingsDestination } from '@/components/settings/settings-sheet';

/** Open the settings hub then the given section. */
export function navigateToSettingsSection(router: Router, dest: SettingsDestination) {
  const base = '/(app)/settings';
  router.push(base as never);
  queueMicrotask(() => router.push(`${base}/${dest}` as never));
}
