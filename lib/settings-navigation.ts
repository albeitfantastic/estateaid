import type { Router } from 'expo-router';

import type { SettingsDestination } from '@/components/settings/settings-sheet';

/** Open the settings hub then the given section (owner and guest use the same flow). */
export function navigateToSettingsSection(router: Router, app: 'owner' | 'guest', dest: SettingsDestination) {
  const base = app === 'owner' ? '/(owner)/settings' : '/(guest)/settings';
  router.push(base as never);
  queueMicrotask(() => router.push(`${base}/${dest}` as never));
}
