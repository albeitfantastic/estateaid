import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface FocusInputProps extends TextInputProps {
  label: string;
  /** Override border/bg colors for special cases */
  accentColor?: string;
}

export function FocusInput({ label, accentColor, style, ...props }: FocusInputProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const dark = colorScheme === 'dark';
  const accent = accentColor ?? colors.tint;

  const [focused, setFocused] = useState(false);

  return (
    <View style={s.wrap}>
      <Text style={[s.label, { color: colors.icon }]}>{label}</Text>
      <TextInput
        style={[
          s.input,
          {
            borderColor: focused ? accent : colors.border,
            backgroundColor: colors.surface,
            color: colors.text,
            shadowColor: accent,
            shadowOpacity: focused ? 0.14 : 0,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 5,
          },
          style,
        ]}
        placeholderTextColor={colors.icon}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
    </View>
  );
}

export const inputBaseStyle = StyleSheet.create({
  field: { gap: 6 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: 'sans-serif',
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: 'sans-serif',
  },
});

const s = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: 'sans-serif',
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: 'sans-serif',
  },
});
