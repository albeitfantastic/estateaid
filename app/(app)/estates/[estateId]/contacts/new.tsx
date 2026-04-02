import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { FocusInput } from '@/components/ui/focus-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts, Layout, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useContactStore } from '@/store/contact-store';
import { generateId } from '@/lib/id';
import { isRequired } from '@/lib/validators';
import { ContactCategory } from '@/types';

const CATEGORIES: ContactCategory[] = ['emergency', 'staff', 'service', 'utility', 'neighbor', 'other'];
const CATEGORY_LABELS: Record<ContactCategory, string> = { emergency: 'Emergency', staff: 'Staff', service: 'Service', utility: 'Utility', neighbor: 'Neighbor', other: 'Other' };

export default function NewContact() {
  const { t } = useTranslation();
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
      <View style={[styles.header, { paddingTop: insets.top + Layout.sectionGap - 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>{t('titles.newContact')}</ThemedText>
        <TouchableOpacity onPress={submit}>
          <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 16 }}>Save</ThemedText>
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + Spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <FocusInput label="Name *" placeholder="e.g. Giovanni Ferraro" value={name} onChangeText={setName} />
        <FocusInput label="Role *" placeholder="e.g. Caretaker" value={role} onChangeText={setRole} />
        <FocusInput label="Phone" placeholder="+39 055 123 4567" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoCapitalize="none" />
        <FocusInput label="Email" placeholder="contact@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <FocusInput label="Notes" placeholder="Additional notes…" value={notes} onChangeText={setNotes} multiline numberOfLines={3} textAlignVertical="top" style={styles.multi} />
        <View style={styles.field}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Category</ThemedText>
          <View style={styles.pills}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat} style={[styles.pill, { borderColor: category === cat ? colors.tint : colors.border }, category === cat && { backgroundColor: colors.tint }]} onPress={() => setCategory(cat)}>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPaddingX,
    paddingBottom: Layout.sectionGap,
    gap: 12,
  },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 24, fontWeight: '700' },
  form: { paddingHorizontal: Layout.screenPaddingX, gap: Layout.sectionGap, paddingTop: 8 },
  field: { gap: 6 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: Fonts.labelBold },
  multi: { height: 90, paddingTop: 14 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5 },
  pillText: { fontSize: 13, fontWeight: '600', fontFamily: Fonts.headingSemiBold },
});
