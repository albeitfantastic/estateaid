import { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { GuestList } from '@/components/guests/guest-list';
import { ThemedText } from '@/components/themed-text';
import { EstatePickerSheet } from '@/components/ui/estate-picker-sheet';
import { HostProLockTouchable } from '@/components/ui/host-pro-lock';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenScroll, ScreenShell, useScreenTheme } from '@/components/ui/screen-layout';
import { Colors } from '@/constants/theme';
import { useCan, useManagedEstates } from '@/lib/entitlements/capabilities';
import { openHostCapabilityDenied } from '@/lib/entitlements/host-gate';

export default function GuestsIndex() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useScreenTheme();
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
    <ScreenShell
      title={t('titles.guests')}
      headerRight={
        <HostProLockTouchable
          locked={invitableEstates.length === 0 && estates.length > 0}
          feature="guests.invite"
          returnTo="/(app)/guests"
          shrinkToContent
          onPress={startInvite}
          style={[styles.inviteBtn, { backgroundColor: colors.tint }]}
          activeOpacity={0.8}
          accessibilityLabel={t('titles.invite')}
        >
          <IconSymbol name="plus" size={18} color={colors.textOnBrand} />
          <ThemedText style={styles.inviteBtnText}>{t('titles.invite')}</ThemedText>
        </HostProLockTouchable>
      }
    >
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

      <ScreenScroll contentContainerStyle={styles.grow}>
        <GuestList emptyActionLabel={t('titles.invite')} onEmptyAction={startInvite} />
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  inviteBtnText: { color: Colors.light.textOnBrand, fontWeight: '700', fontSize: 14 },
  grow: { flexGrow: 1 },
});
