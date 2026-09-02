import { StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { GuestList } from '@/components/guests/guest-list';
import { FilledButton, ScreenScroll, ScreenShell } from '@/components/ui/screen-layout';
import { useCan } from '@/lib/entitlements/capabilities';
import { openHostCapabilityDenied } from '@/lib/entitlements/host-gate';
import { useMarkInboxSeenOnFocus } from '@/store/inbox-seen-store';

export default function GuestsList() {
  const { t } = useTranslation();
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  useMarkInboxSeenOnFocus('guests', estateId);
  const can = useCan();
  const canInvite = can('guests.invite', { estateId }) || can('owners.invite', { estateId });

  function goInvite() {
    if (!canInvite) {
      openHostCapabilityDenied(estateId, 'guests.invite', `/(app)/estates/${estateId}/guests`);
      return;
    }
    router.push(`/(app)/estates/${estateId}/guests/invite` as never);
  }

  return (
    <ScreenShell title={t('titles.guests')}>
      <ScreenScroll contentContainerStyle={styles.scroll} gap={16}>
        <GuestList estateId={estateId} />
        <FilledButton
          label={t('guestsList.inviteCta')}
          onPress={goInvite}
          style={{ marginTop: 20 }}
        />
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 8 },
});
