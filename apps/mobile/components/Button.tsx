import React, { useMemo } from 'react';
import {
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleSheet,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '../constants/theme';
import { useTheme } from '../lib/theme-context';
import { BouncyPressable } from './animations/BouncyPressable';
import { playSfx } from '../lib/sfx';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'success';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  sound?: boolean;
}

/** Padding belongs on the fill layer, not the bordered shell */
function splitButtonStyle(style?: StyleProp<ViewStyle>) {
  const flat = StyleSheet.flatten(style) ?? {};
  const {
    padding,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    paddingHorizontal,
    paddingVertical,
    backgroundColor,
    ...outer
  } = flat as ViewStyle;

  const inner: ViewStyle = {};
  if (padding != null) inner.padding = padding;
  if (paddingTop != null) inner.paddingTop = paddingTop;
  if (paddingBottom != null) inner.paddingBottom = paddingBottom;
  if (paddingLeft != null) inner.paddingLeft = paddingLeft;
  if (paddingRight != null) inner.paddingRight = paddingRight;
  if (paddingHorizontal != null) inner.paddingHorizontal = paddingHorizontal;
  if (paddingVertical != null) inner.paddingVertical = paddingVertical;
  if (backgroundColor != null) inner.backgroundColor = backgroundColor;

  return { outer, inner };
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
  const { colors, borderRadius, cardBorder, id: themeId } = useTheme();
  const { outer: outerStyle, inner: innerStyle } = splitButtonStyle(style);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        shell: {
          borderRadius: borderRadius.md,
          overflow: 'hidden' as const,
          alignSelf: 'flex-start',
          ...cardBorder(2),
          borderBottomColor: colors.buttonShadow,
          borderRightColor: colors.buttonShadow,
          shadowColor: colors.glow,
          shadowOpacity: 0.45,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        },
        fill: {
          width: '100%',
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          minHeight: 48,
        },
        text: {
          color: '#fff',
          fontSize: 16,
          fontWeight: '700' as const,
          textAlign: 'center' as const,
          textShadowColor: 'rgba(0,0,0,0.4)',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 0,
        },
        disabled: { opacity: 0.5 },
        outlineShell: {
          borderBottomColor: colors.primary,
          borderRightColor: colors.primary,
          shadowOpacity: 0,
          elevation: 0,
        },
      }),
    [themeId, colors, borderRadius, cardBorder]
  );

  const handlePress = () => {
    if (sound) playSfx('tap');
    onPress();
  };

  const content = loading ? (
    <ActivityIndicator color={variant === 'outline' ? colors.primaryLight : '#fff'} />
  ) : (
    <Text
      style={[
        styles.text,
        variant === 'outline' && { color: colors.primaryLight, textShadowRadius: 0 },
        textStyle,
      ]}
    >
      {title}
    </Text>
  );

  if (variant === 'primary') {
    return (
      <BouncyPressable
        onPress={handlePress}
        disabled={disabled || loading}
        style={[styles.shell, outerStyle, (disabled || loading) && styles.disabled]}
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, innerStyle]}
        >
          {content}
        </LinearGradient>
      </BouncyPressable>
    );
  }

  const fillColors: Record<string, string> = {
    secondary: colors.secondary,
    danger: colors.danger,
    success: colors.success,
    outline: 'transparent',
  };

  return (
    <BouncyPressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.shell,
        variant === 'outline' && styles.outlineShell,
        outerStyle,
        (disabled || loading) && styles.disabled,
      ]}
    >
      <LinearGradient
        colors={[fillColors[variant] ?? colors.secondary, fillColors[variant] ?? colors.secondary]}
        style={[styles.fill, innerStyle]}
      >
        {content}
      </LinearGradient>
    </BouncyPressable>
  );
}
