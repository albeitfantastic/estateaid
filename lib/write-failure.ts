import { t } from 'i18next';
import { Alert } from 'react-native';

const FALLBACK_TITLE = "Couldn't save";
const FALLBACK_BODY = 'Your change was undone. Check your connection and try again.';

let lastShownAt = 0;

/**
 * Surfaces a rolled-back optimistic write. Without this a rejected save looks
 * identical to a successful one until the next refresh quietly reverts it.
 */
export function reportWriteFailure(reason?: string): void {
  const now = Date.now();
  // A single user action can fan out into several writes; one alert is enough.
  if (now - lastShownAt < 3000) return;
  lastShownAt = now;

  const title = t('errors.saveFailedTitle', { defaultValue: FALLBACK_TITLE }) ?? FALLBACK_TITLE;
  const body = reason
    ? t('errors.saveFailedReason', {
        defaultValue: 'Your change was undone. {{reason}}',
        reason,
      }) ?? `${FALLBACK_BODY} ${reason}`
    : t('errors.saveFailedBody', { defaultValue: FALLBACK_BODY }) ?? FALLBACK_BODY;

  Alert.alert(title, body);
}
