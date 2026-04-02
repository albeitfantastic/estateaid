import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Layout } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.title, { color: colors.textSecondary }]}>{title}</ThemedText>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.65} hitSlop={10}>
          <ThemedText style={[styles.action, { color: colors.tint }]}>{actionLabel}</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingVertical: Layout.sectionGap - 8,
    marginTop: 6,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontFamily: Fonts.labelBold,
  },
  action: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.label,
    letterSpacing: 0.2,
  },
});
