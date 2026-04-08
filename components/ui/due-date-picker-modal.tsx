import { useMemo } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDate, toISODate } from '@/lib/date-utils';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Called with ISO date YYYY-MM-DD */
  onSelectDate: (dateStr: string) => void;
  onClear?: () => void;
  title: string;
  clearLabel: string;
};

export function DueDatePickerModal({ visible, onClose, onSelectDate, onClear, title, clearLabel }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const dayOptions = useMemo(() => {
    const out: string[] = [];
    const start = new Date();
    for (let i = 0; i < 366; i++) {
      const x = new Date(start);
      x.setDate(start.getDate() + i);
      out.push(toISODate(x));
    }
    return out;
  }, []);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ThemedText type="defaultSemiBold" style={styles.sheetTitle}>
            {title}
          </ThemedText>
          {onClear ? (
            <TouchableOpacity onPress={() => { onClear(); onClose(); }} style={styles.clearBtn}>
              <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>{clearLabel}</ThemedText>
            </TouchableOpacity>
          ) : null}
          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            {dayOptions.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.row, { borderBottomColor: colors.border }]}
                onPress={() => {
                  onSelectDate(d);
                  onClose();
                }}
              >
                <ThemedText>{formatDate(d)}</ThemedText>
                <ThemedText style={[styles.iso, { color: colors.icon }]}>{d}</ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '72%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingBottom: 24,
  },
  sheetTitle: { fontSize: 17, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  clearBtn: { paddingHorizontal: 20, paddingBottom: 8 },
  scroll: { maxHeight: 420 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iso: { fontSize: 12 },
});
