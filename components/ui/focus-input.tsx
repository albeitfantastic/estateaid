import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { typography } from '@/theme';
import { useAppTheme } from '@/theme/useAppTheme';

interface FocusInputProps extends TextInputProps {
  label: string;
  /** Override border/bg colors for special cases */
  accentColor?: string;
}

export function FocusInput({ label, accentColor, style, onFocus, onBlur, ...props }: FocusInputProps) {
  const t = useAppTheme();
  const colors = t.colors;
  const accent = accentColor ?? colors.primary;

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
            backgroundColor: colors.card,
            color: colors.text,
            shadowColor: accent,
            shadowOpacity: focused ? 0.14 : 0,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 5,
          },
          style,
        ]}
        placeholderTextColor={colors.textSoft}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
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
    fontFamily: typography.fontFamily.bold,
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: typography.fontFamily.regular,
  },
});

const s = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: typography.fontFamily.bold,
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: typography.fontFamily.regular,
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
    fontFamily: typography.fontFamily.regular,
    textAlignVertical: 'top',
  },
});
