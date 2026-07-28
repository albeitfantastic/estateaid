import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme } from '@/theme/useAppTheme';
import { showMaisonProUpgradePrompt } from '@/lib/maison-pro-upgrade';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  /** When true, tap shows Maison Pro upgrade prompt instead of `onAction`. */
  actionHostLocked?: boolean;
}

export function SectionHeader({ title, actionLabel, onAction, actionHostLocked }: SectionHeaderProps) {
  const appTheme = useAppTheme();
  const colors = appTheme.colors;
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.title, { color: colors.textMuted }]}>{title}</ThemedText>
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={() => (actionHostLocked ? showMaisonProUpgradePrompt(t) : onAction())}
          activeOpacity={0.65}
          hitSlop={10}
          style={styles.actionRow}
        >
          {actionHostLocked && (
            <View style={[styles.actionLock, { backgroundColor: colors.borderSoft }]}>
              <IconSymbol name="lock.fill" size={10} color={colors.textMuted} />
            </View>
          )}
          <ThemedText style={[styles.action, { color: colors.primary }]}>{actionLabel}</ThemedText>
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
    paddingVertical: 12,
    marginTop: 6,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontFamily: 'Manrope_700Bold',
  },
  action: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: 0.2,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionLock: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
