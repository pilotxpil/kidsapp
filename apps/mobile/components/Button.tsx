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
import { toBoxShadow, toTextShadow } from '../lib/shadow';

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
  compact,
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
              borderRadius: compact ? 14 : 22,
              overflow: 'hidden' as const,
              alignSelf: compact ? ('flex-start' as const) : ('stretch' as const),
              maxWidth: '100%',
              minWidth: 0,
              flexShrink: 1,
              boxShadow: toBoxShadow({
                color: colors.primary,
                offset: { width: 0, height: compact ? 0 : 8 },
                opacity: variant === 'outline' || compact ? 0 : 0.8,
                radius: compact ? 0 : 16,
              }),
              elevation: variant === 'outline' || compact ? 0 : 14,
            }
          : {
              borderRadius: compact ? borderRadius.sm : borderRadius.md,
              overflow: 'hidden' as const,
              alignSelf: compact ? ('flex-start' as const) : ('stretch' as const),
              maxWidth: '100%',
              minWidth: 0,
              flexShrink: 1,
              ...cardBorder(compact ? 1 : 2),
              borderBottomColor: colors.buttonShadow,
              borderRightColor: colors.buttonShadow,
              boxShadow: toBoxShadow({
                color: colors.glow,
                offset: { width: 0, height: compact ? 1 : 4 },
                opacity: compact ? 0.2 : 0.45,
                radius: compact ? 4 : 10,
              }),
              elevation: compact ? 2 : 8,
            },
        fill: {
          width: compact ? undefined : '100%',
          maxWidth: '100%',
          flexShrink: 1,
          paddingVertical: compact ? 6 : ember ? 15 : spacing.md,
          paddingHorizontal: compact ? spacing.sm : spacing.lg,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          minHeight: compact ? 32 : ember ? 52 : 48,
          minWidth: compact ? 72 : undefined,
        },
        sheen: {
          position: 'absolute' as const,
          top: 0,
          left: 0,
          right: 0,
          height: '46%',
          backgroundColor: 'rgba(255,255,255,0.26)',
          pointerEvents: 'none',
        },
        text: {
          color: ember ? colors.textDark : '#fff',
          fontSize: compact ? 13 : ember ? 17 : 16,
          fontWeight: ember ? 'normal' : ('800' as const),
          textAlign: 'center' as const,
          letterSpacing: ember ? 0.35 : 0,
          ...toTextShadow(ember || compact ? 'transparent' : 'rgba(0,0,0,0.4)', { width: 1, height: 1 }, 0),
          flexShrink: 1,
          ...type.title,
        },
        disabled: { opacity: 0.5 },
        outlineShell: ember
          ? {
              borderWidth: 1.5,
              borderColor: colors.primary,
              boxShadow: '0px 0px 0px transparent',
              elevation: 0,
            }
          : {
              borderBottomColor: colors.primary,
              borderRightColor: colors.primary,
              boxShadow: '0px 0px 0px transparent',
              elevation: 0,
            },
      }),
    [themeId, colors, borderRadius, cardBorder, ember, type.title, variant, compact]
  );

  const handlePress = () => {
    onPress();
  };

  const content = loading ? (
    <ActivityIndicator color={variant === 'outline' ? colors.primaryLight : ember ? colors.textDark : '#fff'} />
  ) : (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
      style={[
        styles.text,
        variant === 'outline' && { color: colors.primaryLight },
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
        sound={sound}
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
          {ember && !compact ? <View style={styles.sheen} /> : null}
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
      sound={sound}
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
        {ember && variant !== 'outline' && !compact ? <View style={styles.sheen} /> : null}
        {content}
      </LinearGradient>
    </BouncyPressable>
  );
}
