import { useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  FilledButton,
  GroupedList,
  GroupedRow,
  ScreenFootnote,
  ScreenScroll,
  ScreenShell,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { Radius } from '@/constants/theme';
import { addDays, today } from '@/lib/date-utils';
import { useCan } from '@/lib/entitlements/capabilities';
import { useEstateActorRole } from '@/lib/estate-role';
import { DEFAULT_HANDOVER_ITEMS } from '@/lib/onboarding-starters';
import { useActivityLogStore } from '@/store/activity-log-store';
import { useAuthStore } from '@/store/auth-store';
import { useHandoverStore } from '@/store/handover-store';
import { useStayStore } from '@/store/stay-store';

function paramId(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return '';
}

export default function HandoverScreen() {
  const { estateId: estateIdRaw } = useLocalSearchParams<{ estateId: string | string[] }>();
  const estateId = paramId(estateIdRaw);
  const { colors } = useScreenTheme();
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const can = useCan();
  const role = useEstateActorRole(estateId);
  const isHost = role === 'sponsor' || role === 'owner';
  const canManageTemplate = can('property.edit', estateId);
  const templates = useHandoverStore((s) => s.templates);
  const completions = useHandoverStore((s) => s.completions);
  const setTemplateItems = useHandoverStore((s) => s.setTemplateItems);
  const toggleItem = useHandoverStore((s) => s.toggleItem);
  const stays = useStayStore((s) => s.stays);
  const todayStr = today();
  const [newItem, setNewItem] = useState('');
  const addInputRef = useRef<TextInput>(null);

  const items = useMemo(() => {
    const template = templates.find((x) => x.estateId === estateId);
    return template?.items?.length ? template.items : DEFAULT_HANDOVER_ITEMS;
  }, [templates, estateId]);

  const activeGuestStay = useMemo(() => {
    if (!currentUser || isHost) return null;
    return (
      stays.find(
        (s) =>
          s.estateId === estateId &&
          s.guestId === currentUser.id &&
          todayStr >= s.from &&
          todayStr <= addDays(s.to, 1)
      ) ?? null
    );
  }, [stays, estateId, currentUser, isHost, todayStr]);

  const completion = useMemo(
    () =>
      activeGuestStay
        ? completions.find((c) => c.stayId === activeGuestStay.id)
        : undefined,
    [completions, activeGuestStay]
  );

  async function persist(next: string[]) {
    const { error } = await setTemplateItems(estateId, next);
    if (error) {
      Alert.alert(t('handover.saveFailedTitle'), error);
    }
  }

  async function addItem() {
    if (!canManageTemplate) return;
    const label = newItem.trim();
    if (!label) return;
    if (items.some((item) => item.toLowerCase() === label.toLowerCase())) {
      Alert.alert(t('handover.saveFailedTitle'), t('handover.duplicateItem'));
      return;
    }
    await persist([...items, label]);
    setNewItem('');
  }

  function confirmRemove(item: string) {
    if (!canManageTemplate) return;
    Alert.alert(t('handover.deleteTitle'), t('handover.deleteBody', { item }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => void persist(items.filter((x) => x !== item)),
      },
    ]);
  }

  async function onToggle(item: string) {
    if (!activeGuestStay || !currentUser) return;
    const { error } = await toggleItem({
      estateId,
      stayId: activeGuestStay.id,
      guestId: currentUser.id,
      item,
    });
    if (error) {
      Alert.alert(t('errors.saveFailedTitle'), error);
      return;
    }
    useActivityLogStore.getState().logActivity(estateId, currentUser.id, 'estate_updated', {
      handoverItem: item,
    });
  }

  return (
    <ScreenShell
      title={t('handover.title')}
      headerRight={
        isHost && canManageTemplate ? (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.tint }]}
            onPress={() => addInputRef.current?.focus()}
            accessibilityRole="button"
            accessibilityLabel={t('handover.addItem')}
          >
            <IconSymbol name="plus" size={20} color={colors.textOnBrand} />
          </TouchableOpacity>
        ) : undefined
      }
    >
      <ScreenScroll gap={12}>
        {isHost ? (
          <>
            <ScreenFootnote>{t('handover.hostFootnote')}</ScreenFootnote>
            {items.length === 0 ? (
              <EmptyState
                icon="checkmark.circle.fill"
                title={t('handover.emptyTitle')}
                subtitle={t('handover.emptySub')}
              />
            ) : (
              <GroupedList>
                {items.map((item, i) => (
                  <GroupedRow
                    key={`${item}-${i}`}
                    icon="circle"
                    title={item}
                    trailing={
                      canManageTemplate ? (
                        <TouchableOpacity
                          onPress={() => confirmRemove(item)}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel={t('a11y.delete')}
                        >
                          <IconSymbol name="trash" size={18} color={colors.error} />
                        </TouchableOpacity>
                      ) : undefined
                    }
                    isLast={i === items.length - 1}
                  />
                ))}
              </GroupedList>
            )}
            {canManageTemplate ? (
              <View style={styles.addBlock}>
                <TextInput
                  ref={addInputRef}
                  style={[
                    styles.addInput,
                    { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface },
                  ]}
                  value={newItem}
                  onChangeText={setNewItem}
                  placeholder={t('handover.itemPlaceholder')}
                  placeholderTextColor={colors.icon}
                  returnKeyType="done"
                  onSubmitEditing={() => void addItem()}
                />
                <FilledButton
                  label={t('handover.addItem')}
                  onPress={() => void addItem()}
                  disabled={!newItem.trim()}
                />
              </View>
            ) : null}
          </>
        ) : activeGuestStay ? (
          <>
            <ScreenFootnote>{t('handover.guestFootnote')}</ScreenFootnote>
            <GroupedList>
              {items.map((item, i) => {
                const checked = !!completion?.checked[item];
                return (
                  <GroupedRow
                    key={item}
                    title={item}
                    trailing={
                      <IconSymbol
                        name={checked ? 'checkmark.circle.fill' : 'circle'}
                        size={22}
                        color={checked ? colors.tint : colors.icon}
                      />
                    }
                    onPress={() => onToggle(item)}
                    isLast={i === items.length - 1}
                  />
                );
              })}
            </GroupedList>
          </>
        ) : (
          <ThemedText style={{ color: colors.icon }}>{t('handover.unavailable')}</ThemedText>
        )}
      </ScreenScroll>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  addBlock: { gap: 10 },
  addInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
});
