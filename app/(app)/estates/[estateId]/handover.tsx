import { useMemo, useState } from 'react';
import { Alert, StyleSheet, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  GroupedList,
  GroupedRow,
  ScreenFootnote,
  ScreenScroll,
  ScreenShell,
  FilledButton,
  useScreenTheme,
} from '@/components/ui/screen-layout';
import { addDays, today } from '@/lib/date-utils';
import { useCan } from '@/lib/entitlements/capabilities';
import { useEstateActorRole } from '@/lib/estate-role';
import { DEFAULT_HANDOVER_ITEMS } from '@/lib/onboarding-starters';
import { useActivityLogStore } from '@/store/activity-log-store';
import { useAuthStore } from '@/store/auth-store';
import { useHandoverStore } from '@/store/handover-store';
import { useStayStore } from '@/store/stay-store';

export default function HandoverScreen() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
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
          todayStr >= s.to &&
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
  const [draft, setDraft] = useState(() => items.join('\n'));

  async function saveTemplate() {
    const next = draft
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const { error } = await setTemplateItems(estateId, next.length ? next : items);
    if (error) {
      Alert.alert(t('handover.saveFailedTitle'), error);
    }
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
    <ScreenShell title={t('handover.title')}>
      <ScreenScroll gap={12}>
        {isHost ? (
          <>
            <ScreenFootnote>{t('handover.hostFootnote')}</ScreenFootnote>
            <TextInput
              style={[styles.area, { borderColor: colors.border, color: colors.text }]}
              multiline
              value={draft}
              onChangeText={setDraft}
              textAlignVertical="top"
              editable={canManageTemplate}
            />
            <FilledButton
              label={t('handover.saveChecklist')}
              onPress={saveTemplate}
              disabled={!canManageTemplate}
            />
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
  area: {
    minHeight: 180,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
});
