import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useScreenTheme } from '@/components/ui/screen-layout';

export type Segment<T extends string> = {
  key: T;
  label: string;
  /** Rendered as a pill next to the label when greater than zero. */
  badge?: number;
};

type SegmentedControlProps<T extends string> = {
  segments: Segment<T>[];
  value: T;
  onChange: (key: T) => void;
};

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { colors } = useScreenTheme();

  return (
    <View style={[styles.row, { backgroundColor: colors.background }]}>
      {segments.map((segment) => {
        const active = segment.key === value;
        return (
          <TouchableOpacity
            key={segment.key}
            style={[styles.btn, active && { backgroundColor: colors.tint }]}
            onPress={() => onChange(segment.key)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={segment.label}
          >
            <ThemedText
              style={[styles.label, active ? { color: colors.textOnBrand } : { color: colors.text }]}
              numberOfLines={1}
            >
              {segment.label}
            </ThemedText>
            {segment.badge != null && segment.badge > 0 ? (
              <View
                style={[styles.badge, { backgroundColor: active ? colors.textOnBrand : colors.tint }]}
              >
                <ThemedText
                  style={[styles.badgeText, { color: active ? colors.tint : colors.textOnBrand }]}
                >
                  {segment.badge}
                </ThemedText>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 20,
  },
  label: { fontSize: 12, fontWeight: '600' },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
