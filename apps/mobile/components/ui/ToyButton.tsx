import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../lib/theme-context';
import { CORAL, CORAL_DARK, GOLD, GOLD_DARK, INK, LINE, MINT, MINT_DARK, WHITE } from '../../constants/themes';
import { haptic } from '../../lib/haptics';
import { playSfx, type SfxName } from '../../lib/sfx';
import { Txt } from './Txt';
import { Icon, type IconName } from './Icon';
import { ROW } from '../../lib/dir';

export type ToyVariant = 'primary' | 'gold' | 'success' | 'danger' | 'secondary' | 'quiet' | 'ghost';
type Size = 'lg' | 'md' | 'sm';

const SIZES: Record<Size, { h: number; font: number; pad: number; depth: number; radius: number; icon: number }> = {
  lg: { h: 56, font: 18, pad: 22, depth: 5, radius: 18, icon: 22 },
  md: { h: 48, font: 16, pad: 18, depth: 4, radius: 16, icon: 20 },
  sm: { h: 38, font: 14, pad: 14, depth: 3, radius: 13, icon: 17 },
};

interface ToyButtonProps {
  title?: string;
  onPress?: () => void;
  variant?: ToyVariant;
  size?: Size;
  icon?: IconName;
  /** Custom leading element (e.g. a toy icon). */
  lead?: React.ReactNode;
  trail?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  sound?: SfxName | false;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** The signature control: a chunky sticker that physically presses into its edge. */
export function ToyButton({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  lead,
  trail,
  loading,
  disabled,
  full,
  sound = 'tap',
  style,
  accessibilityLabel,
}: ToyButtonProps) {
  const { world } = useTheme();
  const s = SIZES[size];
  const press = useSharedValue(0);

  const palette: Record<ToyVariant, { face: string; edge: string; text: string; border: string }> = {
    primary: { face: world.accent, edge: world.accentDark, text: world.onAccent, border: INK },
    gold: { face: GOLD, edge: GOLD_DARK, text: INK, border: INK },
    success: { face: MINT, edge: MINT_DARK, text: WHITE, border: INK },
    danger: { face: CORAL, edge: CORAL_DARK, text: WHITE, border: INK },
    secondary: { face: WHITE, edge: INK, text: INK, border: INK },
    quiet: { face: world.accentSoft, edge: LINE, text: world.accentDark, border: 'transparent' },
    ghost: { face: 'transparent', edge: 'transparent', text: world.accentDark, border: 'transparent' },
  };
  const c = palette[variant];
  const flat = variant === 'ghost';
  const depth = flat ? 0 : variant === 'quiet' ? 2 : s.depth;
  const off = disabled || loading;
  // Directional "next" arrows read after the label (on the left in Hebrew).
  const trailingIcon = icon === 'forward' && !!title;

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: press.value * depth }],
  }));

  const content = (
    <View style={[styles.content, { flexDirection: ROW, gap: 8 }]}>
      {loading ? (
        <ActivityIndicator color={c.text} />
      ) : (
        <>
          {lead}
          {icon && !trailingIcon ? <Icon name={icon} size={s.icon} color={c.text} stroke={2.6} /> : null}
          {title ? (
            <Txt v="button" size={s.font} color={c.text} align="center" numberOfLines={1}>
              {title}
            </Txt>
          ) : null}
          {icon && trailingIcon ? <Icon name={icon} size={s.icon} color={c.text} stroke={2.6} /> : null}
          {trail}
        </>
      )}
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 60 });
        haptic.tap();
      }}
      onPressOut={() => {
        press.value = withSpring(0, { damping: 14, stiffness: 420 });
      }}
      onPress={() => {
        if (sound) playSfx(sound, { volume: 0.7 });
        onPress?.();
      }}
      style={[
        { paddingBottom: depth, opacity: disabled ? 0.45 : 1 },
        full ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' },
        style,
      ]}
      hitSlop={size === 'sm' ? 6 : 0}
    >
      {depth > 0 ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              top: depth,
              borderRadius: s.radius,
              backgroundColor: c.edge,
              borderWidth: c.border === 'transparent' ? 0 : 2.5,
              borderColor: c.border,
            },
          ]}
        />
      ) : null}
      <Animated.View
        style={[
          styles.face,
          {
            minHeight: s.h,
            paddingHorizontal: title ? s.pad : 0,
            minWidth: title ? undefined : s.h,
            borderRadius: s.radius,
            backgroundColor: c.face,
            borderWidth: c.border === 'transparent' ? 0 : 2.5,
            borderColor: c.border,
          },
          faceStyle,
        ]}
      >
        {content}
      </Animated.View>
    </Pressable>
  );
}

/** Round icon-only toy button (close, back, add). */
export function IconToy({
  icon,
  onPress,
  variant = 'secondary',
  size = 'sm',
  accessibilityLabel,
}: {
  icon: IconName;
  onPress?: () => void;
  variant?: ToyVariant;
  size?: Size;
  accessibilityLabel: string;
}) {
  return (
    <ToyButton icon={icon} onPress={onPress} variant={variant} size={size} accessibilityLabel={accessibilityLabel} />
  );
}

const styles = StyleSheet.create({
  face: { justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', justifyContent: 'center' },
});
