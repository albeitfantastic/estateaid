import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AddOfflineGuest } from '@/components/guests/add-offline-guest';
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
      <ScreenScroll>
        <GuestList
          estateId={estateId}
          actions={
            <View style={styles.actions}>
              <FilledButton tone="accent" label={t('guestsList.inviteCta')} onPress={goInvite} />
              <AddOfflineGuest estateId={estateId} variant="button" />
            </View>
          }
        />
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 12 },
});
