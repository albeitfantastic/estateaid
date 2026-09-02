import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { FocusInput } from '@/components/ui/focus-input';
import { LocationSearchField } from '@/components/ui/location-search-field';
import { ScreenScroll, ScreenShell, useScreenTheme } from '@/components/ui/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useEstateStore } from '@/store/estate-store';
import { useCan } from '@/lib/entitlements/capabilities';
import { isRequired } from '@/lib/validators';
import { isRemoteImageUrl, uploadEstateCover } from '@/lib/estate-cover-storage';

export default function EditEstate() {
  const { t } = useTranslation();
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const can = useCan();
  const { getEstateById, updateEstate, deleteEstate } = useEstateStore();
  const estate = getEstateById(estateId);

  const [name, setName] = useState(estate?.name ?? '');
  const [location, setLocation] = useState(estate?.location ?? '');
  const [description, setDescription] = useState(estate?.description ?? '');
  const [timeZone, setTimeZone] = useState(estate?.timeZone ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState(estate?.coverImageUrl ?? '');
  const [coverMime, setCoverMime] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const runDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const { error } = await deleteEstate(estateId);
      if (error) {
        Alert.alert(t('common.error'), t('editEstateScreen.deleteFailed'));
        return;
      }
      router.replace('/(app)/estates' as never);
    } finally {
      setDeleting(false);
    }
  }, [deleteEstate, estateId, router, t]);

  // Sponsor-only screen: it carries delete, which spec §3.1 reserves to the sponsor.
  if (estate && !can('property.delete', { estateId })) {
    return <Redirect href={`/(app)/estates/${estateId}` as never} />;
  }

  if (!estate) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>Estate not found.</ThemedText>
      </ThemedView>
    );
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
    if (!isRequired(name)) { Alert.alert('Required', 'Please enter an estate name.'); return; }
    if (!isRequired(location)) { Alert.alert('Required', 'Please enter a location.'); return; }
    setSaving(true);
    try {
      let remoteCover = coverImageUrl || undefined;
      if (remoteCover && !isRemoteImageUrl(remoteCover)) {
        const uploaded = await uploadEstateCover(estateId, remoteCover, coverMime);
        if (!uploaded.url) {
          Alert.alert('Could not save photo', uploaded.error ?? 'Upload failed');
          return;
        }
        remoteCover = uploaded.url;
      }
      await updateEstate(estateId, {
        name: name.trim(),
        location: location.trim(),
        description: description.trim() || undefined,
        timeZone: timeZone.trim(),
        coverImageUrl: remoteCover,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert(t('editEstateScreen.deleteConfirmTitle'), t('editEstateScreen.deleteConfirmBody', { name: estate.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('editEstateScreen.deleteConfirmCta'), style: 'destructive', onPress: () => void runDelete() },
    ]);
  }

  return (
    <ScreenShell
      title={t('titles.editEstate')}
      headerRight={
        <TouchableOpacity onPress={() => void submit()} disabled={saving || deleting}>
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
          style={[styles.photoWrap, { borderColor: colors.border, backgroundColor: colors.tint + '10' }]}
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
        <LocationSearchField
          label="Location *"
          placeholder="Search a city or region"
          value={location}
          onChangeText={setLocation}
        />
        <FocusInput label="Time Zone" placeholder="e.g. Europe/Rome" value={timeZone} onChangeText={setTimeZone} />
        <FocusInput label="Description" placeholder="Optional description…" value={description} onChangeText={setDescription} multiline numberOfLines={4} textAlignVertical="top" style={styles.multiline} />

        <View style={[styles.dangerZone, { borderColor: colors.error + '55' }]}>
          <ThemedText style={[styles.dangerTitle, { color: colors.error }]}>{t('editEstateScreen.deleteProperty')}</ThemedText>
          <ThemedText style={[styles.dangerSub, { color: colors.icon }]}>{t('editEstateScreen.deleteSummary')}</ThemedText>
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: colors.error, opacity: deleting ? 0.6 : 1 }]}
            onPress={confirmDelete}
            disabled={deleting}
            activeOpacity={0.85}
          >
            {deleting ? (
              <ActivityIndicator color={colors.error} />
            ) : (
              <ThemedText style={[styles.deleteBtnText, { color: colors.error }]}>
                {t('editEstateScreen.deleteConfirmCta')}
              </ThemedText>
            )}
          </TouchableOpacity>
        </View>
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  multiline: { height: 110, paddingTop: 14 },
  dangerZone: {
    marginTop: 8,
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  dangerTitle: { fontSize: 16, fontWeight: '700' },
  dangerSub: { fontSize: 13, lineHeight: 18 },
  deleteBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    minWidth: 120,
    alignItems: 'center',
  },
  deleteBtnText: { fontSize: 15, fontWeight: '700' },
});
