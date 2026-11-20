import React from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { ToyButton, type ToyVariant } from './ui/ToyButton';

/**
 * Legacy button API, now drawn with the toy-sticker ToyButton so older screens match the new
 * design. New code should use ToyButton directly.
 */
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'success';
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  sound?: boolean;
}

const MAP: Record<NonNullable<ButtonProps['variant']>, ToyVariant> = {
  primary: 'primary',
  secondary: 'secondary',
  danger: 'danger',
  outline: 'secondary',
  success: 'success',
};

export function Button({ title, onPress, variant = 'primary', loading, disabled, compact, style, sound = true }: ButtonProps) {
  return (
    <ToyButton
      title={title}
      onPress={onPress}
      variant={MAP[variant]}
      size={compact ? 'sm' : 'md'}
      loading={loading}
      disabled={disabled}
      full={!compact}
      style={style}
      sound={sound ? 'tap' : false}
    />
  );
}
