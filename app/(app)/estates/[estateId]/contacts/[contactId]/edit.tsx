import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useContactStore } from '@/store/contact-store';
import { isRequired } from '@/lib/validators';
import { ContactCategory } from '@/types';

const CATEGORIES: ContactCategory[] = ['emergency', 'staff', 'service', 'utility', 'neighbor', 'other'];
const CATEGORY_LABELS: Record<ContactCategory, string> = { emergency: 'Emergency', staff: 'Staff', service: 'Service', utility: 'Utility', neighbor: 'Neighbor', other: 'Other' };

export default function EditContact() {
  const { t } = useTranslation();
  const { contactId } = useLocalSearchParams<{ contactId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { contacts, updateContact } = useContactStore();
  const contact = contacts.find((c) => c.id === contactId);

  const [name, setName] = useState(contact?.name ?? '');
  const [role, setRole] = useState(contact?.role ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [notes, setNotes] = useState(contact?.notes ?? '');
  const [category, setCategory] = useState<ContactCategory>(contact?.category ?? 'service');

  if (!contact) return <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ThemedText>Not found.</ThemedText></ThemedView>;

  function submit() {
    if (!isRequired(name)) { Alert.alert('Required', 'Please enter a name.'); return; }
    updateContact(contactId, { name: name.trim(), role: role.trim(), phone: phone.trim() || undefined, email: email.trim() || undefined, notes: notes.trim() || undefined, category });
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>{t('titles.editContact')}</ThemedText>
        <TouchableOpacity onPress={submit}>
          <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 16 }}>Save</ThemedText>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        {([['Name', name, setName], ['Role', role, setRole], ['Phone', phone, setPhone], ['Email', email, setEmail]] as [string, string, (v: string) => void][]).map(([label, value, setter]) => (
          <View key={label} style={styles.field}>
            <ThemedText style={[styles.label, { color: colors.icon }]}>{label}</ThemedText>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.icon + '44' }]} value={value} onChangeText={setter} autoCapitalize={label === 'Email' || label === 'Phone' ? 'none' : 'sentences'} />
          </View>
        ))}
        <View style={styles.field}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Notes</ThemedText>
          <TextInput style={[styles.input, styles.multi, { color: colors.text, borderColor: colors.icon + '44' }]} value={notes} onChangeText={setNotes} multiline numberOfLines={3} textAlignVertical="top" />
        </View>
        <View style={styles.field}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Category</ThemedText>
          <View style={styles.pills}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat} style={[styles.pill, { borderColor: colors.tint + '55' }, category === cat && { backgroundColor: colors.tint }]} onPress={() => setCategory(cat)}>
                <ThemedText style={[styles.pillText, { color: category === cat ? '#fff' : colors.text }]}>{CATEGORY_LABELS[cat]}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 24, fontWeight: '700' },
  form: { paddingHorizontal: 20, gap: 20, paddingTop: 8 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  multi: { height: 80, paddingTop: 12 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 13, fontWeight: '500' },
});
