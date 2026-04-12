import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface FocusInputProps extends TextInputProps {
  label: string;
  /** Override border/bg colors for special cases */
  accentColor?: string;
}

export function FocusInput({ label, accentColor, style, ...props }: FocusInputProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const accent = accentColor ?? colors.tint;

  const [focused, setFocused] = useState(false);
  const isMultiline = !!props.multiline;
  const baseInput = isMultiline ? s.inputMultiline : s.input;

  return (
    <View style={s.wrap}>
      <Text style={[s.label, { color: colors.icon }]}>{label}</Text>
      <TextInput
        style={[
          baseInput,
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
    fontFamily: Fonts.labelBold,
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: Fonts.body,
  },
});

const s = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: Fonts.labelBold,
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: Fonts.body,
  },
  /** Multiline must not use a fixed height or content overflows and overlaps fields below. */
  inputMultiline: {
    minHeight: 100,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 15,
    fontFamily: Fonts.body,
    textAlignVertical: 'top',
  },
});
