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
    opacity: 0.35,
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
    fontFamily: 'serif',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'sans-serif',
  },
  btn: {
    marginTop: 16,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'sans-serif',
    letterSpacing: 0.3,
  },
});
