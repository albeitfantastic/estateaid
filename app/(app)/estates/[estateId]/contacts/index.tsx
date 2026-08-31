import { Alert, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  GroupedList,
  GroupedRow,
  ScreenScroll,
  ScreenShell,
  SectionLabel,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { useContactStore } from '@/store/contact-store';
import { ContactCategory } from '@/types';

const CATEGORY_ORDER: ContactCategory[] = ['emergency', 'staff', 'service', 'utility', 'neighbor', 'other'];
const CATEGORY_KEYS: Record<ContactCategory, string> = {
  emergency: 'contactsList.categories.emergency',
  staff: 'contactsList.categories.staff',
  service: 'contactsList.categories.service',
  utility: 'contactsList.categories.utility',
  neighbor: 'contactsList.categories.neighbor',
  other: 'contactsList.categories.other',
};

export default function ContactsScreen() {
  const { t } = useTranslation();
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const router = useRouter();
  const { colors } = useScreenTheme();
  const { getContactsByEstate, deleteContact } = useContactStore();
  const contacts = getContactsByEstate(estateId);

  const grouped = CATEGORY_ORDER.map((cat) => ({ cat, contacts: contacts.filter((c) => c.category === cat) })).filter((g) => g.contacts.length > 0);

  function confirmDelete(id: string, name: string) {
    Alert.alert(t('contactsList.deleteTitle'), t('contactsList.deleteBody', { name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteContact(id) },
    ]);
  }

  return (
    <ScreenShell
      title={t('titles.contacts')}
      headerRight={
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.tint }]}
          onPress={() => router.push(`/(app)/estates/${estateId}/contacts/new` as never)}
          accessibilityRole="button"
          accessibilityLabel={t('contactsList.addCta')}
        >
          <IconSymbol name="plus" size={20} color={colors.textOnBrand} />
        </TouchableOpacity>
      }
    >
      {contacts.length === 0 ? (
        <EmptyState icon="phone.fill" title={t('contactsList.emptyTitle')} subtitle={t('contactsList.emptySub')} actionLabel={t('contactsList.addCta')} onAction={() => router.push(`/(app)/estates/${estateId}/contacts/new` as never)} />
      ) : (
        <ScreenScroll>
          {grouped.map(({ cat, contacts: catContacts }) => (
            <View key={cat}>
              <SectionLabel marginTop={cat !== grouped[0]?.cat ? 16 : 0}>{t(CATEGORY_KEYS[cat])}</SectionLabel>
              <GroupedList>
                {catContacts.map((contact, i) => (
                  <GroupedRow
                    key={contact.id}
                    title={contact.name}
                    subtitle={
                      <>
                        <ThemedText style={[styles.role, { color: colors.icon }]}>{contact.role}</ThemedText>
                        {contact.notes ? (
                          <ThemedText style={[styles.notes, { color: colors.icon }]} numberOfLines={1}>
                            {contact.notes}
                          </ThemedText>
                        ) : null}
                      </>
                    }
                    trailing={
                      <View style={styles.actions}>
                        {contact.phone ? (
                          <TouchableOpacity
                            onPress={() => Linking.openURL(`tel:${contact.phone}`)}
                            accessibilityRole="button"
                            accessibilityLabel={t('a11y.call')}
                          >
                            <IconSymbol name="phone.fill" size={20} color={colors.tint} />
                          </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                          onPress={() => router.push(`/(app)/estates/${estateId}/contacts/${contact.id}/edit` as never)}
                          accessibilityRole="button"
                          accessibilityLabel={t('a11y.edit')}
                        >
                          <IconSymbol name="pencil" size={18} color={colors.icon} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => confirmDelete(contact.id, contact.name)}
                          accessibilityRole="button"
                          accessibilityLabel={t('a11y.delete')}
                        >
                          <IconSymbol name="trash" size={18} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    }
                    isLast={i === catContacts.length - 1}
                  />
                ))}
              </GroupedList>
            </View>
          ))}
        </ScreenScroll>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  role: { fontSize: 13 },
  notes: { fontSize: 12 },
  actions: { flexDirection: 'row', gap: 14, alignItems: 'center' },
});
