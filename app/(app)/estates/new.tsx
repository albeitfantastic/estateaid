import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FocusInput } from '@/components/ui/focus-input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LocationSearchField } from '@/components/ui/location-search-field';
import {
    GroupedList,
    GroupedRow,
    ScreenScroll,
    ScreenShell,
    SectionLabel,
    useScreenTheme,
} from '@/components/ui/screen-layout';
import { useCan } from '@/lib/entitlements/capabilities';
import { uploadEstateCover } from '@/lib/estate-cover-storage';
import { getEstateActorRole } from '@/lib/estate-role';
import { generateUuidV4 } from '@/lib/id';
import { openEstateCreatePaywall } from '@/lib/maison-pro-upgrade';
import { ONBOARDING_USE_CASES, type OnboardingUseCase } from '@/lib/onboarding-starters';
import {
    markPropertyTypeReasked,
    shouldReaskPropertyType,
} from '@/lib/use-case-profile';
import { isRequired } from '@/lib/validators';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useInvitationStore } from '@/store/invitation-store';

export default function NewEstate() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const currentUser = useAuthStore((s) => s.currentUser);
  const addEstate = useEstateStore((s) => s.addEstate);
  const updateEstate = useEstateStore((s) => s.updateEstate);
  const allEstates = useEstateStore((s) => s.estates);
  const allInvitations = useInvitationStore((s) => s.invitations);
  const can = useCan();
  const allowed = can('property.create');
  const isCoOwnerElsewhere =
    !!currentUser &&
    allEstates.some((e) => {
      const role = getEstateActorRole(allEstates, allInvitations, e.id, currentUser.id, currentUser.email);
      return role === 'owner';
    });

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [timeZone, setTimeZone] = useState('Europe/London');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverMime, setCoverMime] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reask, setReask] = useState(false);
  const [propertyType, setPropertyType] = useState<OnboardingUseCase | null>(null);

  useEffect(() => {
    if (allowed) return;
    openEstateCreatePaywall({
      isCoOwnerElsewhere,
      returnTo: '/(app)/estates/new',
    });
    router.replace('/(app)/estates' as never);
  }, [allowed, isCoOwnerElsewhere, router]);

  useEffect(() => {
    if (!currentUser) return;
    const hasGuestInvite = allInvitations.some(
      (i) =>
        i.status === 'accepted' &&
        (i.guestId === currentUser.id ||
          (i.guestEmail &&
            currentUser.email &&
            i.guestEmail.toLowerCase() === currentUser.email.toLowerCase()))
    );
    const sponsorsNone = !allEstates.some((e) => e.sponsorUserId === currentUser.id);
    if (!hasGuestInvite || !sponsorsNone) return;
    void shouldReaskPropertyType(currentUser.id).then(setReask);
  }, [currentUser, allInvitations, allEstates]);

  if (!allowed) {
    return <ThemedView style={{ flex: 1 }} />;
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      setCoverImageUrl(result.assets[0].uri);
      setCoverMime(result.assets[0].mimeType ?? null);
    }
  }

  async function submit() {
    if (!isRequired(name)) { Alert.alert(t('common.required'), t('forms.requiredEstateName')); return; }
    if (!isRequired(location)) { Alert.alert(t('common.required'), t('forms.requiredLocation')); return; }
    if (!currentUser) {
      Alert.alert(t('forms.notSignedInTitle'), t('forms.notSignedInBody'));
      return;
    }

    if (reask && !propertyType) {
      Alert.alert(t('onboarding.reaskQ'), t('onboarding.reaskH'));
      return;
    }

    setSaving(true);
    try {
      const estateId = generateUuidV4();
      const { error, code } = await addEstate(
        {
          id: estateId,
          ownerId: currentUser.id,
          sponsorUserId: currentUser.id,
          name: name.trim(),
          location: location.trim(),
          description: description.trim() || undefined,
          timeZone: timeZone.trim(),
          createdAt: new Date().toISOString(),
        },
        { useCase: propertyType }
      );

      if (code === 'NO_FREE_SLOT' || code === 'upgrade_required') {
        openEstateCreatePaywall({
          isCoOwnerElsewhere,
          returnTo: '/(app)/estates/new',
        });
        return;
      }
      if (error) {
        Alert.alert(t('forms.couldNotSaveProperty'), error);
        return;
      }
      if (coverImageUrl) {
        const uploaded = await uploadEstateCover(estateId, coverImageUrl, coverMime);
        if (uploaded.url) {
          await updateEstate(estateId, { coverImageUrl: uploaded.url });
        } else {
          Alert.alert(
            t('estateForm.propertySaved'),
            uploaded.error
              ? t('estateForm.coverUploadFailedReason', { error: uploaded.error })
              : t('estateForm.coverUploadFailed')
          );
        }
      }
      if (reask && propertyType) {
        await markPropertyTypeReasked(currentUser.id, propertyType);
      }
      router.replace('/(app)/home' as never);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenShell
      title={t('titles.newEstate')}
      headerRight={
        <TouchableOpacity onPress={() => void submit()} style={styles.saveBtn} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={colors.tint} size="small" />
          ) : (
            <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 16 }}>{t('common.save')}</ThemedText>
          )}
        </TouchableOpacity>
      }
    >
      <ScreenScroll contentContainerStyle={styles.form} gap={20} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          style={[styles.photoWrap, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
          onPress={pickPhoto}
          activeOpacity={0.8}
        >
          {coverImageUrl ? (
            <Image source={{ uri: coverImageUrl }} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <IconSymbol name="camera.fill" size={28} color={colors.tint} />
              <ThemedText style={{ color: colors.tint, fontWeight: '600', marginTop: 8 }}>
                {t('estateForm.addCoverPhoto')}
              </ThemedText>
              <ThemedText style={{ color: colors.icon, fontSize: 12, marginTop: 2 }}>
                {t('estateForm.coverAspectHint')}
              </ThemedText>
            </View>
          )}
        </TouchableOpacity>

        <FocusInput label={t('estateForm.nameLabel')} placeholder={t('estateForm.namePlaceholder')} value={name} onChangeText={setName} />
        <LocationSearchField
          label={t('estateForm.locationLabel')}
          placeholder={t('estateForm.locationPlaceholder')}
          value={location}
          onChangeText={setLocation}
        />
        {reask ? (
          <>
            <SectionLabel>{t('onboarding.reaskQ')}</SectionLabel>
            <ThemedText style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>
              {t('onboarding.reaskH')}
            </ThemedText>
            <GroupedList>
              {ONBOARDING_USE_CASES.map((uc, i) => {
                const labels = [
                  t('onboarding.useCaseHoliday'),
                  t('onboarding.useCasePrimary'),
                  t('onboarding.useCaseRental'),
                  t('onboarding.useCaseOther'),
                ];
                return (
                  <GroupedRow
                    key={uc}
                    title={labels[i]}
                    onPress={() => setPropertyType(uc)}
                    trailing={propertyType === uc ? (
                      <IconSymbol name="checkmark.circle.fill" size={20} color={colors.tint} />
                    ) : undefined}
                    isLast={i === ONBOARDING_USE_CASES.length - 1}
                  />
                );
              })}
            </GroupedList>
          </>
        ) : null}
        <FocusInput label={t('estateForm.timeZoneLabel')} placeholder={t('estateForm.timeZonePlaceholder')} value={timeZone} onChangeText={setTimeZone} />
        <FocusInput
          label={t('estateForm.descriptionLabel')}
          placeholder={t('estateForm.descriptionPlaceholderGuests')}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={styles.multiline}
        />
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  saveBtn: { padding: 4 },
  form: { paddingTop: 8, gap: 20 },
  photoWrap: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    overflow: 'hidden',
    height: 180,
  },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  multiline: {
    height: 110,
    paddingTop: 14,
  },
});
