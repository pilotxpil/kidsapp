import React, { useMemo } from 'react';
import { TextInput, StyleSheet, View, Text, TextInputProps, ViewStyle } from 'react-native';
import { spacing } from '../constants/theme';
import { useTheme } from '../lib/theme-context';
import { rtl } from '../lib/rtl';

interface InputProps extends TextInputProps {
  label?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, containerStyle, style, ...props }: InputProps) {
  const { colors, borderRadius, id: themeId } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { marginBottom: spacing.md },
        label: {
          color: colors.text,
          fontSize: 14,
          fontWeight: '600',
          marginBottom: spacing.sm,
        },
        input: {
          backgroundColor: colors.bgCardLight,
          borderRadius: borderRadius.sm,
          padding: spacing.md,
          fontSize: 16,
          color: colors.text,
          borderTopWidth: 2,
          borderLeftWidth: 2,
          borderBottomWidth: 2,
          borderRightWidth: 2,
          borderTopColor: colors.borderLight,
          borderLeftColor: colors.borderLight,
          borderBottomColor: colors.borderDark,
          borderRightColor: colors.borderDark,
        },
      }),
    [themeId, colors, borderRadius]
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, rtl.text]}>{label}</Text>}
      <TextInput
        style={[styles.input, rtl.text, style]}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
    </View>
  );
}
