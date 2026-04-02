import type { ReactNode } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
  type TouchableOpacityProps,
} from 'react-native';
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
  /**
   * When true, the outer view does not stretch in flex rows; the inner pressable fills only this box.
   * Use with explicit width/height on `style` (e.g. header icon buttons).
   */
  shrinkToContent?: boolean;
  accessibilityLabel?: TouchableOpacityProps['accessibilityLabel'];
  accessibilityRole?: TouchableOpacityProps['accessibilityRole'];
};

/**
 * Wraps a tappable control; shows a small lock badge when `locked` (Standard tier host features).
 */
export function HostProLockTouchable({
  locked,
  onPress,
  children,
  style,
  activeOpacity = 0.75,
  shrinkToContent = false,
  accessibilityLabel,
  accessibilityRole,
}: Props) {
  const { t } = useTranslation();
  return (
    <View style={[styles.wrap, shrinkToContent && styles.wrapShrink, style]}>
      <TouchableOpacity
        onPress={() => (locked ? showMaisonProUpgradePrompt(t) : onPress())}
        activeOpacity={activeOpacity}
        style={shrinkToContent ? styles.fillBox : styles.fill}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
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
  wrapShrink: { alignSelf: 'flex-start' },
  fill: { width: '100%' },
  fillBox: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
