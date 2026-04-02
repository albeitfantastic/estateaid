import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from './icon-symbol';
import { Colors, Elevation, Fonts, Layout, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? 'light';
  const colors = Colors[scheme];

  return (
    <View style={styles.container}>
      {icon && (
        <View style={[styles.iconWrap, { backgroundColor: colors.tint + '12' }]}>
          <IconSymbol name={icon as never} size={32} color={colors.tint + 'CC'} />
        </View>
      )}
      <ThemedText style={styles.title}>{title}</ThemedText>
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
    paddingHorizontal: Layout.screenPaddingX,
    paddingVertical: Layout.sectionGap * 2,
    gap: 12,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: Fonts.headingSemiBold,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    fontFamily: Fonts.body,
    opacity: 0.75,
  },
  btn: {
    marginTop: 4,
    minHeight: Layout.touchMin,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    fontFamily: Fonts.headingSemiBold,
    letterSpacing: 0.1,
  },
});
