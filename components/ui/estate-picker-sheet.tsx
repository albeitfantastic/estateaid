import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useScreenTheme } from '@/components/ui/screen-layout';

export type PickableEstate = { id: string; name: string; location?: string };

type EstatePickerSheetBase = {
  visible: boolean;
  title?: string;
  estates: PickableEstate[];
  onClose: () => void;
};

type SingleEstatePickerSheetProps = EstatePickerSheetBase & {
  multiple?: false;
  onPick: (estateId: string) => void;
  selectedIds?: never;
  lockedIds?: never;
  onConfirm?: never;
};

type MultiEstatePickerSheetProps = EstatePickerSheetBase & {
  multiple: true;
  onPick?: never;
  selectedIds: string[];
  lockedIds?: string[];
  onConfirm: (estateIds: string[]) => void;
};

export type EstatePickerSheetProps = SingleEstatePickerSheetProps | MultiEstatePickerSheetProps;

/**
 * Bottom sheet used by global entry points that need a property before they can act
 * (add maintenance, invite someone) so the per-property screens stay canonical.
 */
export function EstatePickerSheet(props: EstatePickerSheetProps) {
  const { visible, title, estates, onClose, multiple } = props;
  const { t } = useTranslation();
  const { colors } = useScreenTheme();
  const selectedKey = props.multiple ? props.selectedIds.join('\0') : '';
  const [draft, setDraft] = useState<string[]>(props.multiple ? props.selectedIds : []);

  useEffect(() => {
    if (!visible || !props.multiple) return;
    setDraft(props.selectedIds);
  }, [visible, selectedKey]);

  function toggle(id: string) {
    if (!props.multiple) return;
    setDraft((prev) => {
      if (prev.includes(id)) {
        if (props.lockedIds?.includes(id) || prev.length <= 1) return prev;
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  }

  function confirm() {
    if (!props.multiple || draft.length === 0) return;
    props.onConfirm(draft);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
              {title ?? t('maintenanceOverview.pickPropertyTitle')}
            </ThemedText>
            <View style={styles.headerActions}>
              {multiple ? (
                <TouchableOpacity onPress={confirm} hitSlop={12} disabled={draft.length === 0}>
                  <ThemedText
                    style={{ color: colors.tint, fontWeight: '700', opacity: draft.length === 0 ? 0.4 : 1 }}
                  >
                    {t('common.save')}
                  </ThemedText>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={onClose} hitSlop={12}>
                <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>
                  {t('common.close')}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            {estates.map((estate) => {
              const selected = props.multiple ? draft.includes(estate.id) : false;
              const locked = props.multiple && selected && props.lockedIds?.includes(estate.id);
              return (
                <TouchableOpacity
                  key={estate.id}
                  style={[styles.row, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    if (props.multiple) toggle(estate.id);
                    else props.onPick(estate.id);
                  }}
                  accessibilityRole={props.multiple ? 'checkbox' : 'button'}
                  accessibilityState={multiple ? { checked: selected } : undefined}
                  accessibilityLabel={estate.name}
                >
                  <View style={styles.rowText}>
                    <ThemedText type="defaultSemiBold" numberOfLines={1}>
                      {estate.name}
                    </ThemedText>
                    {estate.location ? (
                      <ThemedText
                        style={{ color: colors.textSecondary, fontSize: 13 }}
                        numberOfLines={1}
                      >
                        {estate.location}
                      </ThemedText>
                    ) : null}
                  </View>
                  {multiple ? (
                    <View
                      style={[
                        styles.checkbox,
                        {
                          backgroundColor: selected ? colors.tint : 'transparent',
                          borderColor: selected ? colors.tint : colors.icon + '55',
                          opacity: locked ? 0.55 : 1,
                        },
                      ]}
                    >
                      {selected ? (
                        <IconSymbol name="checkmark" size={12} color={colors.textOnBrand} />
                      ) : null}
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '55%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  scroll: { maxHeight: 360 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 2 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
