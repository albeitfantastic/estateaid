import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useScreenTheme } from '@/components/ui/screen-layout';
import { Radius } from '@/constants/theme';
import { typography } from '@/theme';

export type SelectOption<T extends string | number> = { value: T; label: string };

type Props<T extends string | number> = {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  action?: { label: string; onPress: () => void };
};

export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  action,
}: Props<T>) {
  const { t } = useTranslation();
  const { colors } = useScreenTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const display = selected?.label ?? String(value);

  return (
    <View style={styles.wrap}>
      <ThemedText style={[styles.label, { color: colors.icon }]}>{label}</ThemedText>
      <TouchableOpacity
        style={[styles.trigger, { borderColor: colors.border, backgroundColor: colors.card }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${display}`}
      >
        <ThemedText style={[styles.triggerText, { color: colors.text }]} numberOfLines={1}>
          {display}
        </ThemedText>
        <IconSymbol name="chevron.down" size={18} color={colors.iconMuted} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View
            style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
                {label}
              </ThemedText>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={12}>
                <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>{t('common.close')}</ThemedText>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
              {options.map((opt) => {
                const on = opt.value === value;
                return (
                  <TouchableOpacity
                    key={String(opt.value)}
                    style={[styles.row, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <ThemedText
                      type={on ? 'defaultSemiBold' : 'default'}
                      style={{ color: on ? colors.tint : colors.text }}
                    >
                      {opt.label}
                    </ThemedText>
                    {on ? <IconSymbol name="checkmark.circle.fill" size={18} color={colors.tint} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {action ? (
              <TouchableOpacity
                style={[styles.row, styles.actionRow, { borderTopColor: colors.border }]}
                onPress={() => {
                  setOpen(false);
                  action.onPress();
                }}
                accessibilityRole="button"
                accessibilityLabel={action.label}
              >
                <View style={styles.actionInner}>
                  <IconSymbol name="plus" size={16} color={colors.tint} />
                  <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>
                    {action.label}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: typography.fontFamily.bold,
  },
  trigger: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  triggerText: { flex: 1, fontSize: 15, fontFamily: typography.fontFamily.regular },
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17 },
  scroll: { maxHeight: 360 },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionRow: {
    borderBottomWidth: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
