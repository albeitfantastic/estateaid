import { StyleSheet, Text, TouchableOpacity, type TouchableOpacityProps } from 'react-native';

import { useScreenTheme } from '@/components/ui/screen-layout';

interface SecondaryButtonProps extends TouchableOpacityProps {
  label: string;
}

export function SecondaryButton({ label, style, ...rest }: SecondaryButtonProps) {
  const { colors } = useScreenTheme();

  return (
    <TouchableOpacity style={[styles.btn, style]} activeOpacity={0.6} {...rest}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Manrope_400Regular',
  },
});
