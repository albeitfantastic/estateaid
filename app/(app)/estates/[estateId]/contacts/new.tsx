import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FocusInput } from '@/components/ui/focus-input';
import { ScreenScroll, ScreenShell, SectionLabel, useScreenTheme } from '@/components/ui/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Layout } from '@/constants/theme';
import { useContactStore } from '@/store/contact-store';
import { generateUuidV4 } from '@/lib/id';
import { isRequired } from '@/lib/validators';
import { ContactCategory } from '@/types';

const CATEGORIES: ContactCategory[] = ['emergency', 'staff', 'service', 'utility', 'neighbor', 'other'];
const CATEGORY_LABELS: Record<ContactCategory, string> = { emergency: 'Emergency', staff: 'Staff', service: 'Service', utility: 'Utility', neighbor: 'Neighbor', other: 'Other' };

function paramString(v: string | string[] | undefined): string | undefined {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

export default function NewContact() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ estateId: string }>();
  const estateId = paramString(params.estateId);
  const router = useRouter();
  const { colors } = useScreenTheme();
  const { addContact, getContactsByEstate } = useContactStore();

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<ContactCategory>('service');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (saving) return;
    if (!estateId) {
      Alert.alert(t('common.error'), 'Missing property for this contact.');
      return;
    }
    if (!isRequired(name)) {
      Alert.alert('Required', 'Please enter a name.');
      return;
    }
    if (!isRequired(role)) {
      Alert.alert('Required', 'Please enter a role/title.');
      return;
    }
    const existing = getContactsByEstate(estateId);
    setSaving(true);
    try {
      const { error } = await addContact({
        id: generateUuidV4(),
        estateId,
        name: name.trim(),
        role: role.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
        category,
        order: existing.length,
        createdAt: new Date().toISOString(),
      });
      if (error) {
        Alert.alert(t('common.error'), error);
        return;
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenShell
      title={t('titles.newContact')}
      headerRight={
        <TouchableOpacity onPress={submit} disabled={saving} accessibilityState={{ disabled: saving }}>
          <ThemedText
            style={{
              color: saving ? colors.icon : colors.tint,
              fontWeight: '600',
              fontSize: 16,
              opacity: saving ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </ThemedText>
        </TouchableOpacity>
      }
    >
      <ScreenScroll contentContainerStyle={styles.form} gap={Layout.sectionGap} keyboardShouldPersistTaps="handled">
        <FocusInput label="Name *" placeholder="e.g. Giovanni Ferraro" value={name} onChangeText={setName} />
        <FocusInput label="Role *" placeholder="e.g. Caretaker" value={role} onChangeText={setRole} />
        <FocusInput label="Phone" placeholder="+39 055 123 4567" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoCapitalize="none" />
        <FocusInput label="Email" placeholder="contact@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <FocusInput label="Notes" placeholder="Additional notes…" value={notes} onChangeText={setNotes} multiline numberOfLines={3} textAlignVertical="top" style={styles.multi} />
        <View style={styles.field}>
          <SectionLabel>Category</SectionLabel>
          <View style={styles.pills}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat} style={[styles.pill, { borderColor: category === cat ? colors.tint : colors.border }, category === cat && { backgroundColor: colors.tint }]} onPress={() => setCategory(cat)}>
                <ThemedText style={[styles.pillText, { color: category === cat ? colors.textOnBrand : colors.text }]}>{CATEGORY_LABELS[cat]}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  form: { paddingTop: 8, gap: Layout.sectionGap },
  field: { gap: 6 },
  multi: { height: 90, paddingTop: 14 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5 },
  pillText: { fontSize: 13, fontWeight: '600', fontFamily: Fonts.headingSemiBold },
});
