import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from './icon-symbol';
import { useAppTheme } from '@/theme/useAppTheme';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const t = useAppTheme();
  const colors = t.colors;

  return (
    <View style={styles.container}>
      {icon && (
        <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
          <IconSymbol name={icon as never} size={32} color={colors.primary} />
        </View>
      )}
      <ThemedText style={styles.title}>{title}</ThemedText>
      {subtitle && (
        <ThemedText style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</ThemedText>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }, t.shadows.md]}
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
    paddingHorizontal: 24,
    paddingVertical: 40,
    gap: 12,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    fontFamily: 'Manrope_400Regular',
    opacity: 0.75,
  },
  btn: {
    marginTop: 4,
    minHeight: 44,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: 0.1,
  },
});
