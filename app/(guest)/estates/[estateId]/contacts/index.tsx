import { useMemo } from 'react';
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionHeader } from '@/components/ui/section-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useContactStore } from '@/store/contact-store';
import { ContactCategory } from '@/types';

const CATEGORY_ORDER: ContactCategory[] = ['emergency', 'staff', 'service', 'utility', 'neighbor', 'other'];
const CATEGORY_LABELS: Record<ContactCategory, string> = { emergency: 'Emergency', staff: 'Staff', service: 'Services', utility: 'Utilities', neighbor: 'Neighbors', other: 'Other' };

export default function GuestContacts() {
  const { t } = useTranslation();
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const allContacts = useContactStore((s) => s.contacts);
  const contacts = useMemo(() => allContacts.filter((c) => c.estateId === estateId), [allContacts, estateId]);
  const grouped = CATEGORY_ORDER.map((cat) => ({ cat, contacts: contacts.filter((c) => c.category === cat) })).filter((g) => g.contacts.length > 0);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.left" size={22} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>{t('titles.contacts')}</ThemedText>
      </View>
      {contacts.length === 0 ? (
        <EmptyState icon="phone.fill" title="No contacts" subtitle="The owner hasn't added any contacts yet." />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          {grouped.map(({ cat, contacts: catContacts }) => (
            <View key={cat}>
              <SectionHeader title={CATEGORY_LABELS[cat]} />
              {catContacts.map((contact) => (
                <View key={contact.id} style={[styles.row, { borderColor: colors.icon + '22', backgroundColor: colors.background }]}>
                  <View style={styles.info}>
                    <ThemedText type="defaultSemiBold">{contact.name}</ThemedText>
                    <ThemedText style={[styles.role, { color: colors.icon }]}>{contact.role}</ThemedText>
                    {contact.notes && <ThemedText style={[styles.notes, { color: colors.icon }]} numberOfLines={2}>{contact.notes}</ThemedText>}
                  </View>
                  <View style={styles.actions}>
                    {contact.phone && (
                      <TouchableOpacity onPress={() => Linking.openURL(`tel:${contact.phone}`)}>
                        <IconSymbol name="phone.fill" size={22} color={colors.tint} />
                      </TouchableOpacity>
                    )}
                    {contact.email && (
                      <TouchableOpacity onPress={() => Linking.openURL(`mailto:${contact.email}`)}>
                        <IconSymbol name="envelope.fill" size={20} color={colors.tint} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 28, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, padding: 14, borderBottomWidth: 1, gap: 12 },
  info: { flex: 1, gap: 2 },
  role: { fontSize: 13 },
  notes: { fontSize: 12 },
  actions: { flexDirection: 'row', gap: 14, alignItems: 'center' },
});
