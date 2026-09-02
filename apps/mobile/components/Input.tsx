import React, { useMemo } from 'react';
import { TextInput, StyleSheet, View, Text, TextInputProps, ViewStyle } from 'react-native';
import { spacing } from '../constants/theme';
import { useTheme } from '../lib/theme-context';
import { useType } from '../lib/typography';
import { rtl } from '../lib/rtl';

interface InputProps extends TextInputProps {
  label?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, containerStyle, style, ...props }: InputProps) {
  const { colors, borderRadius, id: themeId } = useTheme();
  const type = useType();
  const ember = themeId === 'ember';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { marginBottom: spacing.md },
        label: {
          color: colors.text,
          fontSize: 14,
          fontWeight: '600',
          marginBottom: spacing.sm,
          ...type.ui,
        },
        input: ember
          ? {
              backgroundColor: 'rgba(12,8,6,0.72)',
              borderRadius: 16,
              padding: spacing.md,
              fontSize: 16,
              color: colors.text,
              borderWidth: 1,
              borderColor: 'rgba(255,138,61,0.4)',
              ...type.body,
            }
          : {
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
    [themeId, colors, borderRadius, ember, type.ui, type.body]
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
