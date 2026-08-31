import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { FocusInput } from '@/components/ui/focus-input';
import {
  GroupedList,
  GroupedRow,
  ScreenScroll,
  ScreenShell,
  SectionLabel,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useAccountContext, useCan } from '@/lib/entitlements/capabilities';
import { getEstateActorRole } from '@/lib/estate-role';
import { openEstateCreatePaywall } from '@/lib/maison-pro-upgrade';
import { generateUuidV4 } from '@/lib/id';
import { startAppTrialRpc } from '@/lib/start-app-trial';
import { isRequired } from '@/lib/validators';
import { ONBOARDING_USE_CASES, type OnboardingUseCase } from '@/lib/onboarding-starters';
import {
  markPropertyTypeReasked,
  shouldReaskPropertyType,
} from '@/lib/use-case-profile';
import { useInvitationStore } from '@/store/invitation-store';

export default function NewEstate() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const currentUser = useAuthStore((s) => s.currentUser);
  const patchUser = useAuthStore((s) => s.patchUser);
  const addEstate = useEstateStore((s) => s.addEstate);
  const allEstates = useEstateStore((s) => s.estates);
  const allInvitations = useInvitationStore((s) => s.invitations);
  const account = useAccountContext();
  const can = useCan();
  const allowed = can('property.create');
  const needsTrialGrant = !allowed && !account.hasUsedTrial;
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
  const [saving, setSaving] = useState(false);
  const [reask, setReask] = useState(false);
  const [propertyType, setPropertyType] = useState<OnboardingUseCase | null>(null);

  useEffect(() => {
    // Trial users may enter create while !allowed; paywall only on explicit create attempts.
    if (allowed || needsTrialGrant) return;
    router.replace('/(app)/estates' as never);
  }, [allowed, needsTrialGrant, router]);

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

  if (!allowed && !needsTrialGrant) {
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
    }
  }

  async function submit() {
    if (!isRequired(name)) { Alert.alert('Required', 'Please enter an estate name.'); return; }
    if (!isRequired(location)) { Alert.alert('Required', 'Please enter a location.'); return; }
    if (!currentUser) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }

    if (reask && !propertyType) {
      Alert.alert(t('onboarding.reaskQ'), t('onboarding.reaskH'));
      return;
    }

    setSaving(true);
    try {
      if (needsTrialGrant) {
        const trial = await startAppTrialRpc();
        if (!trial.ok && trial.code !== 'TRIAL_ALREADY_USED') {
          Alert.alert('Trial unavailable', trial.reason);
          return;
        }
        if (trial.ok) {
          patchUser({
            hasUsedTrial: true,
            trialEndsAt: trial.trialEndsAt ?? new Date(Date.now() + 14 * 864e5).toISOString(),
            trialStartedAt: new Date().toISOString(),
          });
        }
      }

      const { error, code } = await addEstate(
        {
          id: generateUuidV4(),
          ownerId: currentUser.id,
          sponsorUserId: currentUser.id,
          name: name.trim(),
          location: location.trim(),
          description: description.trim() || undefined,
          coverImageUrl: coverImageUrl || undefined,
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
        Alert.alert('Could not save property', error);
        return;
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
            <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 16 }}>Save</ThemedText>
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
                Add Cover Photo
              </ThemedText>
              <ThemedText style={{ color: colors.icon, fontSize: 12, marginTop: 2 }}>
                16 : 9 recommended
              </ThemedText>
            </View>
          )}
        </TouchableOpacity>

        <FocusInput label="Name *" placeholder="e.g. Villa Serena" value={name} onChangeText={setName} />
        <FocusInput label="Location *" placeholder="e.g. Tuscany, Italy" value={location} onChangeText={setLocation} />
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
        <FocusInput label="Time Zone" placeholder="e.g. Europe/Rome" value={timeZone} onChangeText={setTimeZone} />
        <FocusInput
          label="Description"
          placeholder="Optional description for your guests…"
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
