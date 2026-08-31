import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useScreenTheme } from '@/components/ui/screen-layout';

interface PaywallCloseButtonProps {
  onPress: () => void;
}

export function PaywallCloseButton({ onPress }: PaywallCloseButtonProps) {
  const { colors } = useScreenTheme();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} hitSlop={12}>
      <View style={[styles.closeCircle, { backgroundColor: colors.border }]}>
        <Text style={[styles.closeIcon, { color: colors.textSecondary }]}>✕</Text>
      </View>
    </TouchableOpacity>
  );
}

/** Placeholder to balance ScreenShell header when no close action. */
export function PaywallHeaderSpacer() {
  return <View style={styles.spacer} />;
}

const styles = StyleSheet.create({
  spacer: { width: 30 },
  closeCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 14,
  },
});
