import React from 'react';
import {
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, spacing } from '../constants/theme';
import { BouncyPressable } from './animations/BouncyPressable';
import { playSfx } from '../lib/sfx';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'success';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  sound?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
  textStyle,
  sound = true,
}: ButtonProps) {
  const handlePress = () => {
    if (sound) playSfx('tap');
    onPress();
  };

  if (variant === 'primary') {
    return (
      <BouncyPressable
        onPress={handlePress}
        disabled={disabled || loading}
        style={[styles.wrapper, style, (disabled || loading) && styles.disabled]}
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.text, textStyle]}>{title}</Text>
          )}
        </LinearGradient>
      </BouncyPressable>
    );
  }

  const variantStyles: Record<string, ViewStyle> = {
    secondary: { backgroundColor: colors.secondary },
    danger: { backgroundColor: colors.danger },
    success: { backgroundColor: colors.success },
    outline: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.primary },
  };

  const textColors: Record<string, string> = {
    outline: colors.primaryLight,
  };

  return (
    <BouncyPressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.solid,
        variantStyles[variant],
        style,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={[styles.text, { color: textColors[variant] || '#fff' }, textStyle]}>
          {title}
        </Text>
      )}
    </BouncyPressable>
  );
}

const styles = {
  wrapper: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden' as const,
  },
  gradient: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 52,
  },
  solid: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 52,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  disabled: {
    opacity: 0.5,
  },
};
