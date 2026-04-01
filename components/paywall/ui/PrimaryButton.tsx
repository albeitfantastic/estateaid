import { StyleSheet, Text, TouchableOpacity, type TouchableOpacityProps } from 'react-native';
import { MC } from '../paywall-tokens';

interface PrimaryButtonProps extends TouchableOpacityProps {
  label: string;
}

export function PrimaryButton({ label, style, ...rest }: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.btn, rest.disabled && styles.disabled, style]}
      activeOpacity={0.82}
      {...rest}
    >
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: MC.brand,
    borderRadius: MC.buttonRadius,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: MC.hPad,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    color: '#FFFFFF',
    fontSize: MC.buttonLabel,
    fontWeight: '600',
    letterSpacing: 0.1,
    fontFamily: 'Manrope_600SemiBold',
  },
});
