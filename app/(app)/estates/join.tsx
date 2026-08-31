import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { GuestInvitationsReceivePanel } from '@/components/invitations/guest-invitations-receive-panel';
import { ScreenScroll, ScreenShell } from '@/components/ui/screen-layout';

function paramString(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return '';
}

/**
 * Redeem an invite code and answer pending invitations. Kept URL-addressable because
 * the invite flow (`app/i/[code].tsx`) falls back to it when auto-redeem fails.
 */
export default function JoinPropertyScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const code = paramString(params.code);

  return (
    <ScreenShell title={t('titles.joinProperty')}>
      <ScreenScroll keyboardShouldPersistTaps="handled">
        <GuestInvitationsReceivePanel initialCode={code || undefined} />
      </ScreenScroll>
    </ScreenShell>
  );
}
