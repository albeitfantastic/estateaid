import type { ReactNode } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
  type TouchableOpacityProps,
} from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  openUpgradePaywall,
  type UpgradeFeature,
} from '@/lib/maison-pro-upgrade';
import { openHostCapabilityDenied } from '@/lib/entitlements/host-gate';

const BADGE_SIZE = 22;

type Props = {
  /** When true, tap shows upgrade sheet instead of `onPress`. */
  locked: boolean;
  /**
   * When true, shows the lock badge. Defaults to `locked`.
   * Use with `locked={false}` to mark Pro features that remain open for read.
   */
  showLock?: boolean;
  onPress: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  activeOpacity?: number;
  feature?: UpgradeFeature;
  returnTo?: string;
  /** When set, co-owner lapse does not open the upgrade sheet. */
  estateId?: string;
  shrinkToContent?: boolean;
  accessibilityLabel?: TouchableOpacityProps['accessibilityLabel'];
  accessibilityRole?: TouchableOpacityProps['accessibilityRole'];
};

/**
 * Wraps a tappable control; shows a small lock badge for Pro-gated host features.
 */
export function HostProLockTouchable({
  locked,
  showLock,
  onPress,
  children,
  style,
  activeOpacity = 0.75,
  feature = 'generic',
  returnTo,
  estateId,
  shrinkToContent = false,
  accessibilityLabel,
  accessibilityRole,
}: Props) {
  const badge = showLock ?? locked;
  return (
    <View style={[styles.wrap, shrinkToContent && styles.wrapShrink, style]}>
      <TouchableOpacity
        onPress={() => {
          if (!locked) {
            onPress();
            return;
          }
          if (estateId) {
            openHostCapabilityDenied(estateId, feature, returnTo);
            return;
          }
          openUpgradePaywall(feature, returnTo);
        }}
        activeOpacity={activeOpacity}
        style={shrinkToContent ? styles.fillBox : styles.fill}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
      >
        {children}
      </TouchableOpacity>
      {badge && (
        <View style={styles.badge} pointerEvents="none">
          <IconSymbol name="lock.fill" size={11} color="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', flexDirection: 'column' },
  wrapShrink: { alignSelf: 'flex-start' },
  fill: { width: '100%', flex: 1 },
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
