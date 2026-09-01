import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, StyleSheet, TouchableOpacity } from 'react-native';

import { LocationSearchField } from '@/components/ui/location-search-field';
import { FocusInput } from '@/components/ui/focus-input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SelectField } from '@/components/ui/select-field';
import { FilledButton, ScreenScroll, ScreenShell, useScreenTheme } from '@/components/ui/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { generateUuidV4 } from '@/lib/id';
import { googleMapsSearchUrl } from '@/lib/maps-url';
import { normalizeWebsiteUrl } from '@/lib/website-url';
import { useContactStore } from '@/store/contact-store';
import { useStayActivityStore } from '@/store/stay-activity-store';
import type { StayActivity } from '@/types';

type Props = {
  estateId: string;
  activity?: StayActivity;
};

export function ActivityForm({ estateId, activity }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const { addActivity, updateActivity, deleteActivity, getActivitiesByEstate } = useStayActivityStore();
  const allContacts = useContactStore((s) => s.contacts);
  const contacts = useMemo(
    () =>
      (Array.isArray(allContacts) ? allContacts : [])
        .filter((c) => c.estateId === estateId)
        .sort((a, b) => a.order - b.order),
    [allContacts, estateId]
  );
  const isCreate = !activity;

  const [name, setName] = useState(activity?.name ?? '');
  const [description, setDescription] = useState(activity?.description ?? '');
  const [address, setAddress] = useState(activity?.address ?? '');
  const [placeId, setPlaceId] = useState(activity?.placeId ?? '');
  const [website, setWebsite] = useState(activity?.website ?? '');
  const [contactId, setContactId] = useState(activity?.contactId ?? '');
  const [saving, setSaving] = useState(false);
  const pendingNewContact = useRef(false);
  const knownContactIds = useRef(new Set(contacts.map((c) => c.id)));

  useFocusEffect(
    useCallback(() => {
      if (!pendingNewContact.current) return;
      pendingNewContact.current = false;
      const created = contacts.find((c) => !knownContactIds.current.has(c.id));
      if (created) setContactId(created.id);
    }, [contacts])
  );

  function close() {
    if (router.canGoBack()) router.back();
  }

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const patch = {
        name: name.trim(),
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        placeId: address.trim() ? placeId || undefined : undefined,
        website: normalizeWebsiteUrl(website) ?? (website.trim() || undefined),
        contactId: contactId || undefined,
      };
      if (isCreate) {
        const now = new Date().toISOString();
        const { error } = await addActivity({
          id: generateUuidV4(),
          estateId,
          ...patch,
          order: getActivitiesByEstate(estateId).length,
          createdAt: now,
          updatedAt: now,
        });
        if (error) {
          Alert.alert(t('common.error'), error);
          return;
        }
      } else {
        await updateActivity(activity.id, patch);
      }
      close();
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!activity) return;
    Alert.alert(
      t('activitiesList.deleteTitle'),
      t('activitiesList.deleteBody', { name: name.trim() || activity.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            void deleteActivity(activity.id);
            close();
          },
        },
      ]
    );
  }

  const contactOptions = [
    { value: '', label: t('activitiesList.noContact') },
    ...contacts.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <ScreenShell title={isCreate ? t('titles.newActivity') : t('titles.editActivity')}>
      <ScreenScroll contentContainerStyle={styles.form} gap={16}>
        <FocusInput label={t('activitiesList.name')} value={name} onChangeText={setName} />

        <FocusInput
          label={t('activitiesList.description')}
          value={description}
          onChangeText={setDescription}
        />

        <LocationSearchField
          label={t('activitiesList.address')}
          value={address}
          includeBusinesses
          placeholder={t('activitiesList.addressPlaceholder')}
          onChangeText={(text) => {
            setAddress(text);
            setPlaceId('');
          }}
          onSelectPlace={(place) => {
            setAddress(place.label);
            setPlaceId(place.placeId ?? '');
          }}
        />

        <FocusInput
          label={t('activitiesList.website')}
          value={website}
          onChangeText={setWebsite}
          placeholder={t('activitiesList.websitePlaceholder')}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <SelectField
          label={t('activitiesList.contact')}
          value={contactId}
          options={contactOptions}
          onChange={setContactId}
          action={{
            label: t('activitiesList.addContact'),
            onPress: () => {
              knownContactIds.current = new Set(contacts.map((c) => c.id));
              pendingNewContact.current = true;
              router.push(`/(app)/estates/${estateId}/contacts/new` as never);
            },
          }}
        />

        {address.trim() ? (
          <FilledButton
            label={t('activitiesList.openMaps')}
            onPress={() => void Linking.openURL(googleMapsSearchUrl(address.trim(), placeId || undefined))}
          />
        ) : null}

        {normalizeWebsiteUrl(website) ? (
          <FilledButton
            label={t('activitiesList.openWebsite')}
            onPress={() => {
              const href = normalizeWebsiteUrl(website);
              if (href) void Linking.openURL(href);
            }}
          />
        ) : null}

        <FilledButton
          label={isCreate ? t('common.save') : t('activitiesList.saveChanges')}
          onPress={() => void save()}
          disabled={!name.trim()}
          loading={saving}
          style={{ marginTop: 20 }}
        />

        {activity ? (
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: colors.error }]}
            onPress={confirmDelete}
            activeOpacity={0.7}
          >
            <IconSymbol name="trash" size={16} color={colors.error} />
            <ThemedText style={{ color: colors.error, fontWeight: '600' }}>
              {t('activitiesList.deleteCta')}
            </ThemedText>
          </TouchableOpacity>
        ) : null}
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  form: { paddingTop: 8 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
});
