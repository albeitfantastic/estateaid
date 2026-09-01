import { useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FocusInput } from '@/components/ui/focus-input';
import {
  FormSheet,
  GroupedList,
  GroupedRow,
} from '@/components/ui/screen-layout';
import { generateUuidV4 } from '@/lib/id';
import { useAuthStore } from '@/store/auth-store';
import { useGuestProfileStore } from '@/store/guest-profile-store';
import type { GuestProfile } from '@/types';

type AddOfflineGuestProps = {
  estateId: string;
  onCreated?: (profile: GuestProfile) => void;
};

export function AddOfflineGuest({ estateId, onCreated }: AddOfflineGuestProps) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const addProfile = useGuestProfileStore((s) => s.addProfile);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  function close() {
    if (saving) return;
    setOpen(false);
    setName('');
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || !currentUser) return;
    setSaving(true);
    const profile: GuestProfile = {
      id: generateUuidV4(),
      estateId,
      createdBy: currentUser.id,
      name: trimmed,
      createdAt: new Date().toISOString(),
    };
    const { error } = await addProfile(profile);
    setSaving(false);
    if (error) {
      Alert.alert(t('blockDates.addOfflineFailed'), error);
      return;
    }
    setName('');
    setOpen(false);
    onCreated?.(profile);
  }

  return (
    <>
      <GroupedList>
        <GroupedRow
          icon="person.badge.plus"
          title={t('blockDates.addOffline')}
          subtitle={t('guestsList.offlineHint')}
          onPress={() => setOpen(true)}
          isLast
        />
      </GroupedList>
      <FormSheet
        visible={open}
        title={t('blockDates.addOffline')}
        cancelLabel={t('common.cancel')}
        saveLabel={t('blockDates.addOfflineSave')}
        saveDisabled={!name.trim() || saving}
        onClose={close}
        onSave={() => void save()}
      >
        <FocusInput
          label={t('blockDates.addOfflineName')}
          value={name}
          onChangeText={setName}
          autoFocus
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={() => void save()}
        />
      </FormSheet>
    </>
  );
}
