import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MC } from '../paywall-tokens';

interface PaywallHeaderProps {
  title?: string;
  onClose?: () => void;
  /** Extra top padding — pass insets.top from useSafeAreaInsets */
  topInset?: number;
}

export function PaywallHeader({ title, onClose, topInset = 0 }: PaywallHeaderProps) {
  return (
    <View style={[styles.container, { paddingTop: topInset + 16 }]}>
      {/* Left spacer or title */}
      {title ? (
        <Text style={styles.title}>{title}</Text>
      ) : (
        <View style={styles.spacer} />
      )}

      {onClose && (
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7} hitSlop={12}>
          <View style={styles.closeCircle}>
            <Text style={styles.closeIcon}>✕</Text>
          </View>
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
    paddingHorizontal: MC.hPad,
    paddingBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: MC.text,
    fontFamily: 'Manrope_600SemiBold',
    flex: 1,
  },
  spacer: {
    flex: 1,
  },
  closeBtn: {
    marginLeft: 12,
  },
  closeCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: MC.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 12,
    color: MC.textSecondary,
    fontWeight: '600',
    lineHeight: 14,
  },
});
