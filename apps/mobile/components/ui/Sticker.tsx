import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { INK, LINE, WHITE } from '../../constants/themes';
import { haptic } from '../../lib/haptics';
import { playSfx } from '../../lib/sfx';

type Tone = 'kid' | 'calm';

interface StickerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** kid = ink outline + hard shadow; calm = parent surface (hairline + soft edge). */
  tone?: Tone;
  color?: string;
  pad?: number;
  radius?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
}

function surface(tone: Tone, color: string, radius: number, pad: number): ViewStyle {
  if (tone === 'calm') {
    return {
      backgroundColor: color,
      borderRadius: radius,
      padding: pad,
      borderWidth: 1.5,
      borderColor: LINE,
      boxShadow: `0px 3px 0px ${LINE}`,
    } as ViewStyle;
  }
  return {
    backgroundColor: color,
    borderRadius: radius,
    padding: pad,
    borderWidth: 2.5,
    borderColor: INK,
  };
}

/** A sticker card. Pressable stickers sink into their shadow when touched. */
export function Sticker({
  children,
  style,
  tone = 'kid',
  color = WHITE,
  pad = 16,
  radius = 22,
  onPress,
  onLongPress,
  accessibilityLabel,
  disabled,
}: StickerProps) {
  const depth = tone === 'kid' ? 4 : 0;
  const press = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({
    transform: [{ perspective: 700 }, { translateY: press.value * depth }, { rotateX: `${press.value * (depth ? 7 : 3)}deg` }, { scale: 1 - press.value * 0.015 }],
  }));

  if (!onPress && !onLongPress) {
    return (
      <View style={[{ paddingBottom: depth }, style]}>
        {depth ? <Edge radius={radius} depth={depth} /> : null}
        <View style={surface(tone, color, radius, pad)}>{children}</View>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 70 });
        haptic.tap();
      }}
      onPressOut={() => {
        press.value = withSpring(0, { damping: 14, stiffness: 380 });
      }}
      onPress={() => {
        playSfx('tap', { volume: 0.5 });
        onPress?.();
      }}
      onLongPress={onLongPress}
      style={[{ paddingBottom: depth }, style]}
    >
      {depth ? <Edge radius={radius} depth={depth} /> : null}
      <Animated.View style={[surface(tone, color, radius, pad), anim]}>{children}</Animated.View>
    </Pressable>
  );
}

function Edge({ radius, depth }: { radius: number; depth: number }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        top: depth,
        borderRadius: radius,
        backgroundColor: INK,
      }}
    />
  );
}
