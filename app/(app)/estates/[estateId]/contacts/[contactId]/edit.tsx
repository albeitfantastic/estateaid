import { Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FocusInput } from '@/components/ui/focus-input';
import { SelectField } from '@/components/ui/select-field';
import { FilledButton, ScreenScroll, ScreenShell } from '@/components/ui/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useContactStore } from '@/store/contact-store';
import { isRequired } from '@/lib/validators';
import { ContactCategory } from '@/types';
import { useMarkInboxSeenOnFocus } from '@/store/inbox-seen-store';

const CATEGORIES: ContactCategory[] = ['emergency', 'staff', 'service', 'utility', 'neighbor', 'other'];

export default function EditContact() {
  const { t } = useTranslation();
  const { contactId } = useLocalSearchParams<{ contactId: string }>();
  const router = useRouter();
  useMarkInboxSeenOnFocus('contact', contactId);
  const { contacts, updateContact } = useContactStore();
  const contact = contacts.find((c) => c.id === contactId);

  const [name, setName] = useState(contact?.name ?? '');
  const [role, setRole] = useState(contact?.role ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [notes, setNotes] = useState(contact?.notes ?? '');
  const [category, setCategory] = useState<ContactCategory>(contact?.category ?? 'service');

  if (!contact) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>Not found.</ThemedText>
      </ThemedView>
    );
  }

  function submit() {
    if (!isRequired(name)) {
      Alert.alert('Required', 'Please enter a name.');
      return;
    }
    updateContact(contactId, {
      name: name.trim(),
      role: role.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
      category,
    });
    router.back();
  }

  return (
    <ScreenShell title={t('titles.editContact')}>
      <ScreenScroll contentContainerStyle={styles.form} gap={16}>
        <FocusInput label="Name" value={name} onChangeText={setName} />
        <FocusInput label="Role" value={role} onChangeText={setRole} />
        <FocusInput
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoCapitalize="none"
        />
        <FocusInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <FocusInput
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={styles.notes}
        />
        <SelectField
          label="Category"
          value={category}
          options={CATEGORIES.map((cat) => ({
            value: cat,
            label: t(`contactsList.categories.${cat}`),
          }))}
          onChange={setCategory}
        />
        <FilledButton
          label={t('common.save')}
          onPress={submit}
          disabled={!name.trim()}
          style={{ marginTop: 20 }}
        />
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  form: { paddingTop: 8 },
  notes: { minHeight: 120 },
});
