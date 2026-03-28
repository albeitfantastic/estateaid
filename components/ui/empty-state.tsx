import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from './icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TouchableOpacity } from 'react-native';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.container}>
      {icon && (
        <IconSymbol name={icon as never} size={48} color={colors.icon} style={styles.icon} />
      )}
      <ThemedText type="defaultSemiBold" style={styles.title}>{title}</ThemedText>
      {subtitle && (
        <ThemedText style={[styles.subtitle, { color: colors.icon }]}>{subtitle}</ThemedText>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.tint }]}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <ThemedText style={styles.btnText}>{actionLabel}</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  icon: {
    marginBottom: 8,
    opacity: 0.4,
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
