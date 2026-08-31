import { StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { GuestList } from '@/components/guests/guest-list';
import { HostProLockTouchable } from '@/components/ui/host-pro-lock';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenScroll, ScreenShell, useScreenTheme } from '@/components/ui/screen-layout';
import { useCan } from '@/lib/entitlements/capabilities';
import { openHostCapabilityDenied } from '@/lib/entitlements/host-gate';

export default function GuestsList() {
  const { t } = useTranslation();
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const can = useCan();
  const canInvite = can('guests.invite', { estateId }) || can('owners.invite', { estateId });
  const { colors } = useScreenTheme();

  function goInvite() {
    if (!canInvite) {
      openHostCapabilityDenied(estateId, 'guests.invite', `/(app)/estates/${estateId}/guests`);
      return;
    }
    router.push(`/(app)/estates/${estateId}/guests/invite` as never);
  }

  return (
    <ScreenShell
      title={t('titles.guests')}
      headerRight={
        <HostProLockTouchable
          locked={!canInvite}
          feature="guests.invite"
          returnTo={`/(app)/estates/${estateId}/guests`}
          shrinkToContent
          onPress={goInvite}
          style={[styles.addBtn, { backgroundColor: colors.tint }]}
          activeOpacity={0.8}
          accessibilityLabel={t('titles.invite')}
        >
          <IconSymbol name="plus" size={20} color={colors.textOnBrand} />
        </HostProLockTouchable>
      }
    >
      <ScreenScroll contentContainerStyle={styles.grow}>
        <GuestList
          estateId={estateId}
          emptyActionLabel={t('titles.invite')}
          onEmptyAction={goInvite}
        />
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  grow: { flexGrow: 1 },
});
