import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CalendarColorHint, CalendarColorPicker } from '@/components/guests/calendar-color-picker';
import { FocusInput } from '@/components/ui/focus-input';
import { ThemedText } from '@/components/themed-text';
import {
  FilledButton,
  FormSheet,
  ScreenScroll,
  ScreenShell,
  SectionLabel,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { resolveGuestCalendarColor } from '@/lib/guest-calendar-color';
import { useEstateStore } from '@/store/estate-store';
import { useGuestProfileStore } from '@/store/guest-profile-store';
import { useStayStore } from '@/store/stay-store';

export default function OfflineGuestDetail() {
  const { t } = useTranslation();
  const { profileId } = useLocalSearchParams<{ profileId: string }>();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const profiles = useGuestProfileStore((s) => s.profiles);
  const updateProfile = useGuestProfileStore((s) => s.updateProfile);
  const deleteProfile = useGuestProfileStore((s) => s.deleteProfile);
  const allEstates = useEstateStore((s) => s.estates);
  const stays = useStayStore((s) => s.stays);
  const [renameOpen, setRenameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const profile = useMemo(
    () => profiles.find((p) => p.id === profileId),
    [profiles, profileId]
  );
  const estate = allEstates.find((e) => e.id === profile?.estateId);
  const guestColor = profile
    ? profile.calendarColor ?? resolveGuestCalendarColor(profile.id, [])
    : colors.tint;
  const hasStays = stays.some((s) => s.guestProfileId === profileId);

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
              router.back();
            })();
          },
        },
      ]
    );
  }

  if (!profile) {
    return (
      <ScreenShell title={t('guestsList.offlineSection')}>
        <ThemedText style={{ padding: 20, color: colors.icon }}>{t('common.notFound')}</ThemedText>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={profile.name}>
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
              {estate?.name ?? ''} · {t('guestsList.offlineBadge')}
            </ThemedText>
          </View>
          <TouchableOpacity onPress={openRename} accessibilityLabel={t('guestsList.offlineRename')}>
            <IconSymbol name="pencil" size={18} color={colors.tint} />
          </TouchableOpacity>
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
          onPress={() =>
            router.push(
              `/(app)/stays/block?estateId=${profile.estateId}&guestProfileId=${profile.id}` as never
            )
          }
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
