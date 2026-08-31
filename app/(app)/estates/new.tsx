import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { FocusInput } from '@/components/ui/focus-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useEstateStore } from '@/store/estate-store';
import { useAccountContext, useCan } from '@/lib/entitlements/capabilities';
import { getEstateActorRole } from '@/lib/estate-role';
import { openEstateCreatePaywall } from '@/lib/maison-pro-upgrade';
import { generateUuidV4 } from '@/lib/id';
import { startAppTrialRpc } from '@/lib/start-app-trial';
import { isRequired } from '@/lib/validators';
import { useInvitationStore } from '@/store/invitation-store';

export default function NewEstate() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
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

  useEffect(() => {
    // Trial users may enter create while !allowed; paywall only on explicit create attempts.
    if (allowed || needsTrialGrant) return;
    router.replace('/(app)/estates' as never);
  }, [allowed, needsTrialGrant, router]);

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

      const { error, code } = await addEstate({
        id: generateUuidV4(),
        ownerId: currentUser.id,
        sponsorUserId: currentUser.id,
        name: name.trim(),
        location: location.trim(),
        description: description.trim() || undefined,
        coverImageUrl: coverImageUrl || undefined,
        timeZone: timeZone.trim(),
        createdAt: new Date().toISOString(),
      });

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
      router.replace('/(app)/home' as never);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>{t('titles.newEstate')}</ThemedText>
        <TouchableOpacity onPress={() => void submit()} style={styles.saveBtn} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={colors.tint} size="small" />
          ) : (
            <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 16 }}>Save</ThemedText>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cover photo picker */}
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
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 24, fontWeight: '700' },
  saveBtn: { padding: 4 },
  form: { paddingHorizontal: 20, gap: 20, paddingTop: 8 },
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
