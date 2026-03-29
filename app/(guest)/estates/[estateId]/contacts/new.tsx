import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useContactStore } from '@/store/contact-store';
import { generateId } from '@/lib/id';
import { isRequired } from '@/lib/validators';
import { ContactCategory } from '@/types';

const CATEGORIES: ContactCategory[] = ['emergency', 'staff', 'service', 'utility', 'neighbor', 'other'];
const CATEGORY_LABELS: Record<ContactCategory, string> = { emergency: 'Emergency', staff: 'Staff', service: 'Service', utility: 'Utility', neighbor: 'Neighbor', other: 'Other' };

export default function NewContact() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { addContact, getContactsByEstate } = useContactStore();

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<ContactCategory>('service');

  function submit() {
    if (!isRequired(name)) { Alert.alert('Required', 'Please enter a name.'); return; }
    if (!isRequired(role)) { Alert.alert('Required', 'Please enter a role/title.'); return; }
    const existing = getContactsByEstate(estateId);
    addContact({ id: generateId(), estateId, name: name.trim(), role: role.trim(), phone: phone.trim() || undefined, email: email.trim() || undefined, notes: notes.trim() || undefined, category, order: existing.length, createdAt: new Date().toISOString() });
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>New Contact</ThemedText>
        <TouchableOpacity onPress={submit}>
          <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 16 }}>Save</ThemedText>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        {([['Name *', name, setName, 'e.g. Giovanni Ferraro'], ['Role *', role, setRole, 'e.g. Caretaker'], ['Phone', phone, setPhone, '+39 055 123 4567'], ['Email', email, setEmail, 'contact@example.com']] as [string, string, (v: string) => void, string][]).map(([label, value, setter, placeholder]) => (
          <View key={label} style={styles.field}>
            <ThemedText style={[styles.label, { color: colors.icon }]}>{label}</ThemedText>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.icon + '44' }]} placeholder={placeholder} placeholderTextColor={colors.icon} value={value} onChangeText={setter} keyboardType={label === 'Phone' ? 'phone-pad' : label === 'Email' ? 'email-address' : 'default'} autoCapitalize={label === 'Email' || label === 'Phone' ? 'none' : 'sentences'} />
          </View>
        ))}
        <View style={styles.field}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Notes</ThemedText>
          <TextInput style={[styles.input, styles.multi, { color: colors.text, borderColor: colors.icon + '44' }]} placeholder="Additional notes…" placeholderTextColor={colors.icon} value={notes} onChangeText={setNotes} multiline numberOfLines={3} textAlignVertical="top" />
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
