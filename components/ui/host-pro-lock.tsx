import type { ReactNode } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
  type TouchableOpacityProps,
} from 'react-native';

import {
  openUpgradePaywall,
  type UpgradeFeature,
} from '@/lib/maison-pro-upgrade';
import { openHostCapabilityDenied } from '@/lib/entitlements/host-gate';


type Props = {
  /** When true, tap shows upgrade sheet instead of `onPress`. */
  locked: boolean;
  /** @deprecated Lock badges are no longer shown. */
  showLock?: boolean;
  onPress: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  activeOpacity?: number;
  feature?: UpgradeFeature;
  returnTo?: string;
  /** When set, coverage lapse uses host-gate sheet instead of generic upgrade. */
  estateId?: string;
  shrinkToContent?: boolean;
  accessibilityLabel?: TouchableOpacityProps['accessibilityLabel'];
  accessibilityRole?: TouchableOpacityProps['accessibilityRole'];
};

/**
 * Wraps a tappable control. When `locked`, tap opens the upgrade / coverage sheet
 * instead of `onPress`. Lock badges are not shown (slot economy — paywall only on create).
 */
export function HostProLockTouchable({
  locked,
  showLock: _showLock,
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
});
