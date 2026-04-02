import type { ReactNode } from 'react';
import { StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { showMaisonProUpgradePrompt } from '@/lib/maison-pro-upgrade';

const BADGE_SIZE = 22;

type Props = {
  /** When true, tap shows upgrade prompt instead of `onPress`. */
  locked: boolean;
  onPress: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  activeOpacity?: number;
};

/**
 * Wraps a tappable control; shows a small lock badge when `locked` (Standard tier host features).
 */
export function HostProLockTouchable({ locked, onPress, children, style, activeOpacity = 0.75 }: Props) {
  const { t } = useTranslation();
  return (
    <View style={[styles.wrap, style]}>
      <TouchableOpacity
        onPress={() => (locked ? showMaisonProUpgradePrompt(t) : onPress())}
        activeOpacity={activeOpacity}
        style={styles.fill}
      >
        {children}
      </TouchableOpacity>
      {locked && (
        <View style={styles.badge} pointerEvents="none">
          <IconSymbol name="lock.fill" size={11} color="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  fill: { width: '100%' },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
