import { Alert, BackHandler, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CalendarColorHint, CalendarColorPicker } from '@/components/guests/calendar-color-picker';
import { FocusInput } from '@/components/ui/focus-input';
import { ThemedText } from '@/components/themed-text';
import { EstatePickerSheet } from '@/components/ui/estate-picker-sheet';
import {
  FilledButton,
  FormSheet,
  GroupedList,
  GroupedRow,
  ScreenScroll,
  ScreenShell,
  SectionLabel,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { resolveGuestCalendarColor } from '@/lib/guest-calendar-color';
import { useManagedEstates } from '@/lib/entitlements/capabilities';
import { useEstateStore } from '@/store/estate-store';
import { useGuestProfileStore } from '@/store/guest-profile-store';
import { useStayStore } from '@/store/stay-store';
import { guestProfileEstateIds } from '@/types';

function guestsAndHostsHref(estateId?: string) {
  return estateId ? `/(app)/estates/${estateId}/guests` : '/(app)/guests';
}

export default function OfflineGuestDetail() {
  const { t } = useTranslation();
  const { profileId, estateId: routeEstateId } = useLocalSearchParams<{
    profileId: string;
    estateId?: string;
  }>();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const profiles = useGuestProfileStore((s) => s.profiles);
  const updateProfile = useGuestProfileStore((s) => s.updateProfile);
  const deleteProfile = useGuestProfileStore((s) => s.deleteProfile);
  const allEstates = useEstateStore((s) => s.estates);
  const { estates: managedEstates } = useManagedEstates();
  const stays = useStayStore((s) => s.stays);
  const [renameOpen, setRenameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [propertyPickerOpen, setPropertyPickerOpen] = useState(false);

  const profile = useMemo(
    () => profiles.find((p) => p.id === profileId),
    [profiles, profileId]
  );
  const linkedEstateIds = useMemo(
    () => (profile ? guestProfileEstateIds(profile) : []),
    [profile]
  );
  const linkedEstates = useMemo(
    () =>
      linkedEstateIds
        .map((id) => allEstates.find((e) => e.id === id))
        .filter((e): e is NonNullable<typeof e> => !!e),
    [allEstates, linkedEstateIds]
  );
  const guestColor = profile
    ? profile.calendarColor ?? resolveGuestCalendarColor(profile.id, [])
    : colors.tint;
  const hasStays = stays.some((s) => s.guestProfileId === profileId);
  const lockedEstateIds = useMemo(
    () =>
      [...new Set(
        stays.filter((s) => s.guestProfileId === profileId).map((s) => s.estateId)
      )],
    [stays, profileId]
  );
  const listEstateId = Array.isArray(routeEstateId) ? routeEstateId[0] : routeEstateId;
  const guestsHref = guestsAndHostsHref(listEstateId);

  function goBackToGuests() {
    router.dismissTo(guestsHref as never);
  }

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        router.dismissTo(guestsHref as never);
        return true;
      });
      return () => sub.remove();
    }, [guestsHref, router])
  );

  function openRename() {
    if (!profile) return;
    setNameDraft(profile.name);
    setRenameOpen(true);
  }

  async function saveName() {
    const trimmed = nameDraft.trim();
    if (!profile || !trimmed) return;
    const { error } = await updateProfile(profile.id, { name: trimmed });
    if (error) {
      Alert.alert(t('blockDates.addOfflineFailed'), error);
      return;
    }
    setRenameOpen(false);
  }

  async function saveEstates(nextEstateIds: string[]) {
    if (!profile) {
      setPropertyPickerOpen(false);
      return;
    }
    const unique = [...new Set(nextEstateIds)];
    const same =
      unique.length === linkedEstateIds.length &&
      unique.every((id) => linkedEstateIds.includes(id));
    if (unique.length === 0 || same) {
      setPropertyPickerOpen(false);
      return;
    }
    const { error } = await updateProfile(profile.id, { estateIds: unique });
    if (error) {
      Alert.alert(t('blockDates.addOfflineFailed'), error);
      return;
    }
    setPropertyPickerOpen(false);
  }

  function confirmDelete() {
    if (!profile) return;
    Alert.alert(
      t('guestsList.offlineDeleteTitle'),
      t('guestsList.offlineDeleteBody', { name: profile.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('guestsList.offlineDeleteCta'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const { error } = await deleteProfile(profile.id);
              if (error) {
                Alert.alert(t('guestsList.offlineDeleteTitle'), error);
                return;
              }
              goBackToGuests();
            })();
          },
        },
      ]
    );
  }

  if (!profile) {
    return (
      <ScreenShell title={t('guestsList.offlineSection')} onBack={goBackToGuests}>
        <ThemedText style={{ padding: 20, color: colors.icon }}>{t('common.notFound')}</ThemedText>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={profile.name} onBack={goBackToGuests}>
      <EstatePickerSheet
        visible={propertyPickerOpen}
        title={t('guestsList.offlineProperty')}
        estates={managedEstates}
        multiple
        selectedIds={linkedEstateIds}
        lockedIds={lockedEstateIds}
        onConfirm={(ids) => void saveEstates(ids)}
        onClose={() => setPropertyPickerOpen(false)}
      />
      <ScreenScroll gap={16}>
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: guestColor + '20' }]}>
            <ThemedText style={[styles.avatarText, { color: guestColor }]}>
              {profile.name.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <View style={styles.profileInfo}>
            <ThemedText type="defaultSemiBold" style={styles.profileName}>{profile.name}</ThemedText>
            <ThemedText style={[styles.profileMeta, { color: colors.textSecondary }]}>
              {linkedEstates.map((e) => e.name).join(', ') || t('common.unknownEstate')}
              {' · '}
              {t('guestsList.offlineBadge')}
            </ThemedText>
          </View>
          <TouchableOpacity onPress={openRename} accessibilityLabel={t('guestsList.offlineRename')}>
            <IconSymbol name="pencil" size={18} color={colors.tint} />
          </TouchableOpacity>
        </View>

        <View>
          <SectionLabel>{t('guestsList.offlineProperty')}</SectionLabel>
          <GroupedList>
            <GroupedRow
              title={
                linkedEstates.map((e) => e.name).join(', ') || t('common.unknownEstate')
              }
              subtitle={
                linkedEstates.length === 1 ? linkedEstates[0]?.location : undefined
              }
              trailing={
                managedEstates.length > 1 ? (
                  <IconSymbol name="chevron.right" size={16} color={colors.icon} />
                ) : undefined
              }
              onPress={
                managedEstates.length > 1 ? () => setPropertyPickerOpen(true) : undefined
              }
              isLast
            />
          </GroupedList>
          {lockedEstateIds.length > 0 ? (
            <ThemedText style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8 }}>
              {t('guestsList.offlinePropertyLocked')}
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.colorBlock}>
          <SectionLabel>{t('guestsList.calendarColor')}</SectionLabel>
          <CalendarColorHint>{t('guestsList.calendarColorHint')}</CalendarColorHint>
          <CalendarColorPicker
            value={guestColor}
            onChange={(color) => {
              void updateProfile(profile.id, { calendarColor: color });
            }}
          />
        </View>

        <FilledButton
          label={t('estateHub.addStay')}
          icon="calendar.badge.plus"
          onPress={() => {
            const stayEstateId =
              (listEstateId && linkedEstateIds.includes(listEstateId)
                ? listEstateId
                : linkedEstateIds[0]) ?? '';
            router.push(
              `/(app)/stays/block?estateId=${stayEstateId}&guestProfileId=${profile.id}` as never
            );
          }}
        />

        <TouchableOpacity
          style={[styles.removeBtn, { backgroundColor: colors.error + '12', borderColor: colors.error + '30' }]}
          onPress={confirmDelete}
          disabled={hasStays}
          activeOpacity={0.75}
        >
          <IconSymbol name="trash.fill" size={16} color={colors.error} />
          <ThemedText style={[styles.removeBtnText, { color: colors.error }]}>
            {t('guestsList.offlineDeleteCta')}
          </ThemedText>
        </TouchableOpacity>
        {hasStays ? (
          <ThemedText style={{ color: colors.textSecondary, fontSize: 13 }}>
            {t('guestsList.offlineDeleteBody', { name: profile.name })}
          </ThemedText>
        ) : null}
      </ScreenScroll>

      <FormSheet
        visible={renameOpen}
        title={t('guestsList.offlineRename')}
        cancelLabel={t('common.cancel')}
        saveLabel={t('common.save')}
        saveDisabled={!nameDraft.trim()}
        onClose={() => setRenameOpen(false)}
        onSave={() => void saveName()}
      >
        <FocusInput
          label={t('guestsList.offlineRename')}
          value={nameDraft}
          onChangeText={setNameDraft}
          autoFocus
          autoCapitalize="words"
        />
      </FormSheet>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700' },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 18 },
  profileMeta: { fontSize: 13 },
  colorBlock: { gap: 10 },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  removeBtnText: { fontSize: 14, fontWeight: '700' },
});
