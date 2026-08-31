import { StyleSheet, Text, TouchableOpacity, type TouchableOpacityProps } from 'react-native';

import { useScreenTheme } from '@/components/ui/screen-layout';
import { Radius } from '@/constants/theme';

interface PrimaryButtonProps extends TouchableOpacityProps {
  label: string;
}

export function PrimaryButton({ label, style, ...rest }: PrimaryButtonProps) {
  const { colors } = useScreenTheme();

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        { backgroundColor: colors.accent, borderRadius: Radius.md, shadowColor: colors.accent },
        rest.disabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.8}
      {...rest}
    >
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
  disabled: {
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
  },
  label: {
    color: '#F8F6F2',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.1,
    fontFamily: 'Manrope_600SemiBold',
  },
});
