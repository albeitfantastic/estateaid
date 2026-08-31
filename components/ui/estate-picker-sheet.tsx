import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { useScreenTheme } from '@/components/ui/screen-layout';

export type PickableEstate = { id: string; name: string; location?: string };

type EstatePickerSheetProps = {
  visible: boolean;
  title?: string;
  estates: PickableEstate[];
  onPick: (estateId: string) => void;
  onClose: () => void;
};

/**
 * Bottom sheet used by global entry points that need a property before they can act
 * (add maintenance, invite someone) so the per-property screens stay canonical.
 */
export function EstatePickerSheet({
  visible,
  title,
  estates,
  onPick,
  onClose,
}: EstatePickerSheetProps) {
  const { t } = useTranslation();
  const { colors } = useScreenTheme();

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
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>
                {t('common.close')}
              </ThemedText>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            {estates.map((estate) => (
              <TouchableOpacity
                key={estate.id}
                style={[styles.row, { borderBottomColor: colors.border }]}
                onPress={() => onPick(estate.id)}
                accessibilityRole="button"
                accessibilityLabel={estate.name}
              >
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
              </TouchableOpacity>
            ))}
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
    gap: 2,
  },
});
