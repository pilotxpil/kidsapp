import React, { useMemo } from 'react';
import {
  Text,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
  StyleSheet,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '../constants/theme';
import { useTheme } from '../lib/theme-context';
import { useType } from '../lib/typography';
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
  const type = useType();
  const ember = themeId === 'ember';
  const { outer: outerStyle, inner: innerStyle } = splitButtonStyle(style);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        shell: ember
          ? {
              borderRadius: 22,
              overflow: 'hidden' as const,
              alignSelf: 'flex-start',
              shadowColor: colors.primary,
              shadowOpacity: variant === 'outline' ? 0 : 0.8,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: variant === 'outline' ? 0 : 14,
            }
          : {
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
          paddingVertical: ember ? 15 : spacing.md,
          paddingHorizontal: spacing.lg,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          minHeight: ember ? 52 : 48,
        },
        sheen: {
          position: 'absolute' as const,
          top: 0,
          left: 0,
          right: 0,
          height: '46%',
          backgroundColor: 'rgba(255,255,255,0.26)',
        },
        text: {
          color: ember ? colors.textDark : '#fff',
          fontSize: ember ? 17 : 16,
          fontWeight: ember ? 'normal' : ('800' as const),
          textAlign: 'center' as const,
          letterSpacing: ember ? 0.35 : 0,
          textShadowColor: ember ? 'transparent' : 'rgba(0,0,0,0.4)',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 0,
          ...type.title,
        },
        disabled: { opacity: 0.5 },
        outlineShell: ember
          ? {
              borderWidth: 1.5,
              borderColor: colors.primary,
              shadowOpacity: 0,
              elevation: 0,
            }
          : {
              borderBottomColor: colors.primary,
              borderRightColor: colors.primary,
              shadowOpacity: 0,
              elevation: 0,
            },
      }),
    [themeId, colors, borderRadius, cardBorder, ember, type.title, variant]
  );

  const handlePress = () => {
    if (sound) playSfx('tap');
    onPress();
  };

  const content = loading ? (
    <ActivityIndicator color={variant === 'outline' ? colors.primaryLight : ember ? colors.textDark : '#fff'} />
  ) : (
    <Text
      style={[
        styles.text,
        variant === 'outline' && { color: ember ? colors.primaryLight : colors.primaryLight, textShadowRadius: 0 },
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
          colors={
            ember
              ? ['#FFD56A', '#FF8A3D', '#FF5A00']
              : [colors.gradientStart, colors.gradientEnd]
          }
          start={ember ? { x: 0.5, y: 0 } : { x: 0, y: 0 }}
          end={ember ? { x: 0.5, y: 1 } : { x: 1, y: 0 }}
          style={[styles.fill, innerStyle]}
        >
          {ember ? <View style={styles.sheen} pointerEvents="none" /> : null}
          {content}
        </LinearGradient>
      </BouncyPressable>
    );
  }

  const fillColors: Record<string, string> = {
    secondary: colors.secondary,
    danger: colors.danger,
    success: colors.success,
    outline: ember ? 'rgba(255,90,0,0.12)' : 'transparent',
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
        {ember && variant !== 'outline' ? <View style={styles.sheen} pointerEvents="none" /> : null}
        {content}
      </LinearGradient>
    </BouncyPressable>
  );
}
