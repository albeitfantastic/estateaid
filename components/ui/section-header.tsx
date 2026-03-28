import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
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
      <ThemedText type="defaultSemiBold" style={styles.title}>{title}</ThemedText>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    opacity: 0.5,
  },
  action: {
    fontSize: 14,
    fontWeight: '600',
  },
});
