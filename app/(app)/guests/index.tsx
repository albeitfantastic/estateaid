import { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { GuestList } from '@/components/guests/guest-list';
import { EstatePickerSheet } from '@/components/ui/estate-picker-sheet';
import { FilledButton, ScreenScroll, ScreenShell } from '@/components/ui/screen-layout';
import { useCan, useManagedEstates } from '@/lib/entitlements/capabilities';
import { openHostCapabilityDenied } from '@/lib/entitlements/host-gate';

export default function GuestsIndex() {
  const { t } = useTranslation();
  const router = useRouter();
  const can = useCan();
  const { estates } = useManagedEstates();
  const [pickerOpen, setPickerOpen] = useState(false);

  /** Invites are authored per property, so the global entry needs a target first. */
  const invitableEstates = useMemo(
    () => estates.filter((e) => can('guests.invite', e.id) || can('owners.invite', e.id)),
    [estates, can]
  );

  function startInvite() {
    if (invitableEstates.length === 0) {
      const fallbackId = estates[0]?.id;
      if (fallbackId) {
        openHostCapabilityDenied(fallbackId, 'guests.invite', '/(app)/guests');
      } else {
        router.push('/(app)/estates' as never);
      }
      return;
    }
    if (invitableEstates.length === 1) {
      router.push(`/(app)/estates/${invitableEstates[0].id}/guests/invite` as never);
      return;
    }
    setPickerOpen(true);
  }

  return (
    <ScreenShell title={t('titles.guests')}>
      <EstatePickerSheet
        visible={pickerOpen}
        title={t('guestsList.pickPropertyToInvite')}
        estates={invitableEstates}
        onPick={(estateId) => {
          setPickerOpen(false);
          router.push(`/(app)/estates/${estateId}/guests/invite` as never);
        }}
        onClose={() => setPickerOpen(false)}
      />

      <ScreenScroll contentContainerStyle={styles.scroll} gap={16}>
        <GuestList />
        <FilledButton
          label={t('guestsList.inviteCta')}
          onPress={startInvite}
          style={{ marginTop: 20 }}
        />
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 8 },
});
