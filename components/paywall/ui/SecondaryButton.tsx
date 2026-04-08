import { StyleSheet, Text, TouchableOpacity, type TouchableOpacityProps } from 'react-native';
import { MC } from '../paywall-tokens';

interface SecondaryButtonProps extends TouchableOpacityProps {
  label: string;
}

export function SecondaryButton({ label, style, ...rest }: SecondaryButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.btn, style]}
      activeOpacity={0.6}
      {...rest}
    >
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: MC.hPad,
  },
  label: {
    color: MC.textSecondary,
    fontSize: MC.secondary,
    fontWeight: '500',
    fontFamily: 'Manrope_400Regular',
  },
});
