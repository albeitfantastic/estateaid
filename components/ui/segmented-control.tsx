import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useScreenTheme } from '@/components/ui/screen-layout';
import { Layout } from '@/constants/theme';

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
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      {segments.map((segment) => {
        const active = segment.key === value;
        return (
          <TouchableOpacity
            key={segment.key}
            style={[
              styles.btn,
              { borderBottomColor: active ? colors.text : 'transparent' },
            ]}
            onPress={() => onChange(segment.key)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={segment.label}
          >
            <ThemedText
              style={[
                styles.label,
                { color: active ? colors.text : colors.textSecondary },
                active && styles.labelActive,
              ]}
              numberOfLines={1}
            >
              {segment.label}
            </ThemedText>
            {segment.badge != null && segment.badge > 0 ? (
              <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                <ThemedText style={[styles.badgeText, { color: colors.textOnBrand }]}>
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
  row: {
    flexDirection: 'row',
    paddingHorizontal: Layout.screenPaddingX,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    minHeight: Layout.touchMin,
    borderBottomWidth: 2,
    marginBottom: -StyleSheet.hairlineWidth,
  },
  label: { fontSize: 13, fontWeight: '500', letterSpacing: 0.4 },
  labelActive: { fontWeight: '700' },
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
